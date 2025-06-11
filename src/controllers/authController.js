const supabase = require('../config/supabase');
const prisma = require('../config/prisma');
const { OAuth2Client } = require('google-auth-library');
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require('../utils/responseHandler');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const tokenStore = require('../utils/tokenStore');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const config = require('../config/environment');

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { email, password, name, phone = '' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return errorResponse(res, authError.message, 400);
    }

    const user = await prisma.customer.create({
      data: {
        email,
        name,
        phone
      }
    });

    return successResponse(res, {
      user,
      token: authData.session?.access_token
    }, 'Registration successful', 201);
  } catch (error) {
    return errorResponse(res, 'Error during registration', 500, error);
  }
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const otpStore = new Map(); // Simple in-memory store for OTPs, consider persistent store for production

const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      return errorResponse(res, 'Email is already verified and registered', 400);
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP with expiration (e.g., 10 minutes)
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });

    const mailOptions = {
      from: config.smtpFrom,
      to: email,
      subject: 'Your Email Verification Code',
      html: `<p>Your verification code is: <strong>${otp}</strong></p>
             <p>This code will expire in 10 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);

    return successResponse(res, null, 'Verification email sent with OTP');
  } catch (error) {
    console.error('Error sending verification email:', error);
    return errorResponse(res, 'Error sending verification email', 500, error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return errorResponse(res, 'Email and OTP are required', 400);
    }

    const record = otpStore.get(email);
    if (!record) {
      return errorResponse(res, 'OTP not found or expired', 400);
    }

    if (record.expiresAt < Date.now()) {
      otpStore.delete(email);
      return errorResponse(res, 'OTP expired', 400);
    }

    if (record.otp !== otp) {
      return errorResponse(res, 'Invalid OTP', 400);
    }

    // OTP is valid, remove it
    otpStore.delete(email);

    // Check if user already exists (email verified)
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Mark email as verified by allowing registration (frontend flow)
    // Here we just return success
    return successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    return errorResponse(res, 'Error verifying OTP', 500, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return errorResponse(res, 'Verification token is required', 400);
    }

    // Validate token
    const validation = tokenStore.validateToken(token);
    if (!validation.valid) {
      return errorResponse(res, validation.reason, 400);
    }

    const email = validation.email;

    // Check if user already exists (email verified)
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      tokenStore.invalidateToken(token);
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Mark email as verified by allowing registration (frontend flow)
    // Here we just invalidate the token and return success
    tokenStore.invalidateToken(token);

    return successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    return errorResponse(res, 'Error verifying email', 500, error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Get user profile
    const user = await prisma.customer.findUnique({
      where: { email }
    });

    if (!user) {
      return errorResponse(res, 'User profile not found', 404);
    }

    return successResponse(res, {
      user,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Error during login', 500, error);
  }
};

const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return errorResponse(res, 'Error during logout', 400);
    }

    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Error during logout', 500, error);
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return errorResponse(res, 'Not authenticated', 401);
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return errorResponse(res, 'User profile not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving user', 500, error);
  }
};

const googleSignIn = async (req, res) => {
  try {
    // Frontend sends Google ID Token in 'access_token' field (from credentialResponse.credential)
    const { access_token: googleIdToken } = req.body; 

    if (!googleIdToken) {
      return errorResponse(res, 'Google ID token is missing', 400);
    }

    // ✅ NEW: Verify the Google ID Token directly with google-auth-library
    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: googleIdToken,
            audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });
    } catch (verificationError) {
        console.error("Google ID Token verification failed:", verificationError.message);
        return errorResponse(res, 'Invalid Google ID token', 401);
    }

    const payload = ticket.getPayload(); // Get the payload from the verified token
    const googleEmail = payload.email;
    const googleName = payload.name || payload.given_name || googleEmail; // Fallback for name

    if (!googleEmail) {
        return errorResponse(res, 'Google email not found in token payload', 400);
    }

    // Check if user exists in our local database (Prisma) using Google email
    let user = await prisma.customer.findUnique({
      where: { email: googleEmail }
    });

    // If user doesn't exist in our Prisma database, create a new profile
    if (!user) {
      user = await prisma.customer.create({
        data: {
          email: googleEmail,
          name: googleName,
          phone: '', // Phone can be updated later, Google usually doesn't provide it directly
          // Add other default fields your 'Customer' model requires
        }
      });
      console.log("New customer profile created in Prisma for Google user:", user.email);
    } else {
      console.log("Existing customer profile found in Prisma for Google user:", user.email);
      // Optional: Update existing user's name if Google provides a newer one
      // await prisma.customer.update({
      //   where: { email: user.email },
      //   data: {
      //     name: googleName,
      //     // ... other fields you want to update
      //   }
      // });
    }

    // ✅ NEW: Generate a custom JWT (access token) for the user session
    // This token will represent the user's logged-in status in your application.
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: 'customer' }, // Payload for your JWT
      JWT_SECRET, // Your secret key
      { expiresIn: '1h' } // Token expires in 1 hour (adjust as needed)
    );

    // For a full authentication flow, you'd also implement a refresh token system.
    // For simplicity, we are only generating an access token here.
    // If you need refresh tokens, you'd generate and store them (e.g., in DB) and
    // return them to the client.

    return successResponse(res, {
      user, // The Prisma customer object
      session: { // Custom session details for frontend
        userId: user.id,
        authToken: accessToken,
        // refresh_token: null, // No refresh token generated in this simple setup
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60) // Expires in 1 hour (in seconds from epoch)
      }
    }, 'Google sign-in successful', 200);
  } catch (error) {
    console.error("Error during Google sign-in process:", error);
    return errorResponse(res, 'Error during Google sign-in', 500, error);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    return successResponse(res, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at
    }, 'Token refreshed successfully');
  } catch (error) {
    return errorResponse(res, 'Error refreshing token', 500, error);
  }
};

module.exports = {
  register,
  sendVerificationEmail,
  verifyEmail,
  login,
  logout,
  getCurrentUser,
  googleSignIn,
  refreshToken,
  verifyOtp
};
