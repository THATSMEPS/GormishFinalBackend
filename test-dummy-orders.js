// Script to insert dummy orders for restaurant-side testing
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Find or create a restaurant
  let restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    const area = await prisma.areaTable.findFirst();
    restaurant = await prisma.restaurant.create({
      data: {
        name: 'Testaurant',
        mobile: '9999999999',
        email: 'testaurant@example.com',
        cuisines: 'Indian,Chinese',
        vegNonveg: 'both',
        hours: {},
        address: {},
        areaId: area.id,
        banners: [],
      }
    });
  }

  // Find or create a customer
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        phone: '8888888888',
        email: 'testcustomer@example.com',
        areaId: restaurant.areaId,
        address: {},
      }
    });
  }

  // Find or create a menu item
  let menuItem = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant.id } });
  if (!menuItem) {
    menuItem = await prisma.menuItem.create({
      data: {
        name: 'Paneer Tikka',
        description: 'Delicious starter',
        price: 199.99,
        discountedPrice: 149.99,
        isVeg: true,
        packagingCharges: 20,
        cuisine: 'Indian',
        restaurantId: restaurant.id,
        addons: [],
      }
    });
  }

  // Insert dummy orders
  for (let i = 1; i <= 3; i++) {
    await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        status: 'preparing',
        paymentType: 'ONLINE',
        customerNotes: `Test order note ${i}`,
        distance: 5.0 + i,
        itemsAmount: menuItem.discountedPrice * 2,
        gst: (menuItem.discountedPrice * 2) * 0.05,
        deliveryFee: 10 * (5.0 + i),
        totalAmount: (menuItem.discountedPrice * 2) * 1.05 + 10 * (5.0 + i),
        orderType: 'delivery', // Added required field
        items: {
          create: [
            {
              menuItemId: menuItem.id,
              quantity: 2,
              basePrice: menuItem.price,
              totalPrice: menuItem.discountedPrice * 2,
              addons: [],
            }
          ]
        }
      }
    });
  }

  console.log('Dummy orders inserted!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
