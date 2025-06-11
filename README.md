# Gormish Backend

## Project Overview
Gormish Backend is a Node.js backend service built with Express.js, Prisma ORM, and PostgreSQL. It provides a RESTful API for managing restaurants, menus, orders, customers, delivery partners, reviews, and more. The backend supports authentication, authorization, real-time communication via Socket.io, and integrates with Supabase and Google authentication.

## Features
- User authentication and authorization (customers, restaurants, delivery partners)
- Restaurant and menu management
- Order processing with status updates and payment handling
- Customer and delivery partner management
- Reviews and ratings for orders, restaurants, and delivery partners
- Real-time updates using Socket.io
- Input validation and error handling
- Integration with Supabase and Google OAuth

## Installation

### Prerequisites
- Node.js (v16 or higher recommended)
- PostgreSQL database
- npm (Node Package Manager)

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gormish-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and configure the following variables:
   ```
   PORT=3000
   DATABASE_URL=postgresql://user:password@host:port/database
   # Add other environment variables as needed (e.g., Supabase keys, JWT secrets)
   ```

4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### API Base URL
```
http://localhost:<PORT>/api
```

### Health Check
```
GET /api/health
```
Returns API status and environment info.

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user (customer, restaurant, or delivery partner)
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout (requires authentication)
- `GET /api/auth/me` - Get current user info (requires authentication)
- `POST /api/auth/send-verification-email` - Send verification email
- `POST /api/auth/verify-otp` - Verify OTP for email
- `POST /api/auth/google` - Google sign-in with access token

### Order Endpoints
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create a new order (requires authentication)
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders/customer/:customerId` - Get orders for a customer (requires authentication)
- `GET /api/orders/restaurant/:restaurantId` - Get orders for a restaurant
- `GET /api/orders/restaurant/:restaurantId/history` - Get restaurant order history (requires authentication)
- `GET /api/orders/delivery-partner/:dpId` - Get orders for a delivery partner

### Other API Endpoints
The backend also provides endpoints for managing:
- Areas (`/api/areas`)
- Cuisines (`/api/cuisines`)
- Customers (`/api/customers`)
- Delivery Partners (`/api/delivery-partners`)
- Menu Items (`/api/menu`)
- Restaurants (`/api/restaurants`)
- Reviews (`/api/reviews`)

Refer to the source code in the `src/routes` and `src/controllers` directories for detailed endpoint implementations.

## Database Schema Overview
The backend uses Prisma ORM with a PostgreSQL database. Key models include:
- **AreaTable**: Geographic areas with pincodes, city, and state.
- **Restaurant**: Restaurants with details, menus, and orders.
- **MenuItem**: Menu items with pricing, availability, and addons.
- **Customer**: Customers with contact info and orders.
- **DeliveryPartner**: Delivery personnel with status and vehicle info.
- **Order**: Orders with status, payment, items, and relations.
- **OrderItem**: Items within an order.
- **OrderReview**: Reviews and ratings for orders.
- **Cuisine**: Types of cuisines offered.

Enums are used for gender, order status, payment types, and delivery partner statuses.

## Environment Variables
- `PORT`: Port number for the server (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- Other variables for Supabase, JWT secrets, Google OAuth, etc., should be configured as needed.

## Project Structure
```
/prisma
  schema.prisma          # Prisma schema and database models
/src
  /config               # Configuration files (environment, prisma, supabase)
/controllers            # Business logic for API endpoints
/middleware             # Middleware for auth, validation, error handling
/routes                 # Express route definitions
/services               # Service utilities (e.g., error handling)
/utils                  # Utility functions
app.js                  # Main Express app setup and server start
package.json            # Project metadata and dependencies
README.md               # Project documentation
```

## Running Tests
Test files like `test-db.js` and `test-dummy-orders.js` are included for testing database and dummy data. Run them with Node.js as needed.

## License
This project is licensed under the ISC License.

## Contribution
Contributions are welcome. Please fork the repository and create pull requests for any enhancements or bug fixes.

## Contact
For questions or support, please contact the project maintainers.

---
This README was generated based on the current project structure and code.
