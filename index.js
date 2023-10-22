const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid'); // Import the UUID library
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3030;

app.use(cors('*'));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const pool = new Pool({
    //connectionString:'postgres://cartuser:MElQVIijb5i5PmtHKzPonnP1NgwdxiOm@dpg-ckq22phrfc9c73ei6bng-a/cartdb'
     connectionString: 'postgres://cartuser:MElQVIijb5i5PmtHKzPonnP1NgwdxiOm@dpg-ckq22phrfc9c73ei6bng-a.oregon-postgres.render.com/cartdb?ssl=true',
});

// Create the users table
const createUsersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL
);
`;

// Create the products table with product_id as UUID
const createProductsTableQuery = `
CREATE TABLE IF NOT EXISTS products (
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);
`;

// Create the cart table with user_id and product_id as UUID
const createCartTableQuery = `
CREATE TABLE IF NOT EXISTS cart (
  cart_id serial PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL
);
`;

const createShopBasketsTableQuery = `
CREATE TABLE IF NOT EXISTS shop_baskets (
  basket_id VARCHAR(36) NOT NULL,
  basket_name VARCHAR(255) NOT NULL
);
`;

const createUserBasketsTableQuery = `
CREATE TABLE IF NOT EXISTS user_baskets (
  user_basket_id serial PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  basket_id VARCHAR(36) NOT NULL
);
`;

// Execute the SQL query to create the user_baskets table
pool.query(createUserBasketsTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating user_baskets table:', err);
  } else {
    console.log('User baskets table created successfully');
  }
});

// Execute the SQL query to create the shop_baskets table
pool.query(createShopBasketsTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating shop_baskets table:', err);
  } else {
    console.log('Shop baskets table created successfully');
  }
});

// Execute the SQL queries to create the tables
pool.query(createUsersTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating users table:', err);
  } else {
    console.log('Users table created successfully');
  }
});

pool.query(createProductsTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating products table:', err);
  } else {
    console.log('Products table created successfully');
  }
});

pool.query(createCartTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating cart table:', err);
  } else {
    console.log('Cart table created successfully');
  }
});


// Add a new shop basket
app.post('/add-basket', async (req, res) => {
    const { basketName,basketId } = req.body;
  
    try {
      // Generate a unique basket ID
       
  
      // Insert the new shop basket into the shop_baskets table
      const result = await pool.query(
        'INSERT INTO shop_baskets (basket_id, basket_name) VALUES ($1, $2)',
        [basketId, basketName]
      );
  
      res.status(201).json({ message: 'Shop basket added successfully.', basket_id: basketId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding shop basket.' });
    }
  });

  
// User registration

app.get('/users/list', async (req, res) => {
    try {
        // Retrieve all users from the 'users' table
        const users = await pool.query('SELECT user_id, username FROM users');
        res.status(200).json({ users: users.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error listing users.' });
    }
});


app.get('/check-basket-assignment', async (req, res) => {
    const { basketId } = req.query; // Assuming you pass basketId as a query parameter
  
    try {
      // Check if the basket has been assigned to a user
      const result = await pool.query(
        'SELECT user_id FROM user_baskets WHERE basket_id = $1',
        [basketId]
      );
  
      if (result.rows.length > 0) {
        // Basket is assigned to a user, return the user ID
        res.status(200).json({ userId: result.rows[0].user_id , code: 1});
      } else {
        // Basket is not assigned to any user
        res.status(404).json({ message: 'Basket is not assigned to any user' , code: 0,});
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error checking basket assignment' });
    }
  });

  
// Assign a shop basket to the user
app.post('/assign-basket', async (req, res) => {
    const { userId, basketId } = req.body;
  
    try {
      // Check if the user is already assigned to another basket
      const userAssignedToBasket = await pool.query(
        'SELECT basket_id FROM user_baskets WHERE user_id = $1',
        [userId]
      );
  
      if (userAssignedToBasket.rows.length > 0) {
        res.status(400).json({ message: 'Assignment failed. User is already assigned to another basket.' });
      } else {
        // Check if the user and the shop basket exist
        const userExists = await pool.query('SELECT EXISTS (SELECT 1 FROM users WHERE user_id = $1)', [userId]);
        const basketExists = await pool.query('SELECT EXISTS (SELECT 1 FROM shop_baskets WHERE basket_id = $1)', [basketId]);
  
        if (userExists.rows[0].exists && basketExists.rows[0].exists) {
          // Assign the shop basket to the user
          const result = await pool.query(
            'INSERT INTO user_baskets (user_id, basket_id) VALUES ($1, $2)',
            [userId, basketId]
          );
  
          res.status(201).json({ message: 'Shop basket assigned to the user successfully.' });
        } else {
          res.status(400).json({ message: 'Assignment failed. User or shop basket does not exist.' });
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error assigning shop basket to the user.' });
    }
  });
  

  
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Generate a UUID for the user
        const user_id = uuidv4();

        // Create a new user with the generated UUID
        const result = await pool.query(
            'INSERT INTO users (user_id, username, password) VALUES ($1, $2, $3)',
            [user_id, username, password]
        );

        res.status(201).json({ message: 'User registered successfully.', user_id: user_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'User registration failed.' });
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the user exists
      const user = await pool.query('SELECT user_id FROM users WHERE username = $1 AND password = $2', [username, password]);
  
      if (user.rows.length === 1) {
        const userId = user.rows[0].user_id;
        res.status(200).json({ message: 'User logged in successfully.', code: 1, user_id: userId });
      } else {
        res.status(401).json({ message: 'Login failed. Invalid credentials.', code: 0 });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Login failed.' });
    }
  });
  
// User logout
app.get('/logout', (req, res) => {
    res.status(200).json({ message: 'User logged out successfully.' });
});

// Get items in the user's cart
app.post('/cart/items', async (req, res) => {
    const { userId } = req.body;
  
    try {
      // Retrieve the items in the user's cart with product name, price, and quantity
      const cartItems = await pool.query(
        'SELECT p.product_name, p.price, c.quantity FROM cart c ' +
        'INNER JOIN products p ON c.product_id = p.product_id ' +
        'WHERE c.user_id = $1',
        [userId]
      );
  
      // Calculate the total price
      let total = 0;
      cartItems.rows.forEach((item) => {
        const itemPrice = parseFloat(item.price);
        const itemQuantity = parseInt(item.quantity);
        total += itemPrice * itemQuantity;
      });
  
      res.status(200).json({ items: cartItems.rows, total });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error getting cart items and calculating total price.' });
    }
  });
  


// Add an item to the user's cart
app.post('/cart/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;

    try {
        // Add the item to the user's cart in the database
        const result = await pool.query(
            'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
            [userId, productId, quantity]
        );

        res.status(200).json({ message: 'Item added to cart successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding item to cart.' });
    }
});

// Remove an item from the user's cart
app.delete('/cart/remove/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;

    try {
        // Remove the item from the user's cart in the database
        const result = await pool.query(
            'DELETE FROM cart WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        res.status(200).json({ message: 'Item removed from cart successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing item from cart.' });
    }
});

// Clear the user's cart
app.delete('/cart/clear/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        // Clear the user's cart in the database
        const result = await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);

        res.status(200).json({ message: 'Cart cleared successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error clearing the cart.' });
    }
});

// Checkout the user's cart (implement payment processing as needed)
app.post('/cart/checkout/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        // Implement payment processing and order creation here
        // ...

        // After a successful checkout, clear the user's cart
        await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);

        res.status(200).json({ message: 'Checkout successful. Cart cleared.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Checkout failed.' });
    }
});

// Define routes for fetching product information, e.g., listing products, getting product details, etc.
// ...
// Add a product with a specified product_id
app.post('/products/add', async (req, res) => {
    const { product_name, price, product_id  } = req.body;
 
    try {
        // Insert the new product into the 'products' table with the specified product_id
        const result = await pool.query(
            'INSERT INTO products (product_id, product_name, price) VALUES ($1, $2, $3) RETURNING product_id',
            [product_id, product_name, price]
        );

        res.status(201).json({ message: 'Product added successfully.', product_id: result.rows[0].product_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding product.' });
    }
});


app.get('/products/list', async (req, res) => {
    try {
        // Retrieve all products from the 'products' table
        const products = await pool.query('SELECT * FROM products');
        res.status(200).json({ products: products.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error listing products.' });
    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
