
# firebase-realtime-database

## Project Description
`firebase-realtime-database` is a TypeScript library designed to simplify interactions with Firebase Realtime Database directly. By adding a layer of Type Safety and schema validation via [Zod](https://zod.dev/), this library helps you manage data in your database securely and with a well-defined structure. It also automatically handles authentication using a Service Account and the Google Auth Library.

## Why This Project Was Created
This project was created to:
- **Enhance Type Safety**: Provide secure interactions with Firebase Realtime Database using TypeScript.
- **Validate Data**: Enforce data schemas with Zod to ensure that stored and retrieved data conforms to the defined structure.
- **Reduce Complexity**: Abstract away the details of Access Token management and direct Firebase REST API calls, leading to cleaner and more readable code.
- **User-Friendly Abstraction**: Offer `FirebaseCollection` for managing single documents and `FirebaseTable` for managing collections of documents.

## Key Features
- **Type-Safe Database Operations**: Define and enforce data schemas using Zod.
- **Collection Data Management**:
  - `get()`: Retrieve a single document.
  - `set()`: Set a document's data (creates or updates).
  - `update()`: Update a document's data using a callback function.
  - `delete()`: Delete a document.
- **Table Data Management**:
  - `create()`: Create a new document in a collection and return its ID.
  - `findAll()`: Retrieve all documents in a collection.
  - `findById()`: Find a document by its ID.
  - `findByChild()`: Find a single document by a field's value.
  - `filterByChild()`: Filter multiple documents by a field's value.
  - `transitionByChild()`: Update a document found by a field's value.
  - `transitionById()`: Update a document by its ID.
  - `deleteById()`: Delete a document by its ID.
- **Automatic Access Token Management**: Utilizes the Google Auth Library to automatically obtain and manage Access Tokens for Firebase REST API calls.

## Technologies Used
- [typescript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh) ( for Build )
- [Zod](https://zod.dev) ( for Schema Validation )
- [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs) ( for Firebase Authentication )

## Installation and Usage

**Prerequisites**
You need to have Node.js or Bun installed on your system.

**Installation**
You can install this library via npm, yarn, or bun:
``` bash
# With npm
npm install firebase-realtime-database

# With bun
bun add firebase-realtime-database
```

**Usage**
**1. Firebase Service Account Setup**
You will need a Service Account JSON file from your Firebase Project (go to Project settings -> Service accounts -> Generate new private key).

**2. Initializing `FirebaseApp`**
``` ts

import { FirebaseApp, zod, type Credentials } from 'firebase-realtime-database';

const credentials: Credentials = {
    project_id: "service_account_project_id",
    private_key: "service_account_private_key", // or use env, process.env['PRIVATE_KEY'].replace(/\\n/g, '\n')
    client_email: "service_account_client_email"
}

const firebaseApp = new FirebaseApp({
    credentials, database: 'https://your-project-id-default-rtdb.firebaseio.com/' // Your Realtime Database URL
});

```

**3. Using `FirebaseCollection` ( for single documents )**
Suppose you want to store user settings:
``` ts

const UserSettingsSchema = {
    theme: zod.string().default('light'),
    notificationsEnabled: zod.boolean().default(true),
    lastLogin: zod.number().optional(),
};

const userSettings = firebaseApp.collection('user-settings/user123', UserSettingsSchema);

async function manageUserSettings() {
    // Set user data
    await userSettings.set({
        theme: 'dark',
        notificationsEnabled: true,
        lastLogin: Date.now()
    });
    console.log('User settings set.');

    // Retrieve user data
    const settings = await userSettings.get();
    console.log('Current settings:', settings);

    // Update user data (using a callback function)
    await userSettings.update(legacySettings => {
        if (legacySettings) {
            return {
                ...legacySettings,
                notificationsEnabled: false
            };
        }
        return { theme: 'light', notificationsEnabled: false }; // If no existing data
    });
    console.log('Settings updated.');

    // Delete user data
    // await userSettings.delete();
    // console.log('User settings deleted.');
}

manageUserSettings();

```

**4. Using `FirebaseTable` ( for collections of documents )**
Suppose you want to store product data:
``` ts

const ProductSchema = {
    name: zod.string(),
    price: zod.number().positive(),
    category: zod.string(),
    inStock: zod.boolean().default(true),
};

const productsTable = firebaseApp.table('products', ProductSchema);

async function manageProducts() {
    // Create a new product
    const newProductId = await productsTable.create({
        name: 'Laptop Pro',
        price: 1200,
        category: 'Electronics',
    });
    console.log('New product created with ID:', newProductId);

    // Create another product
    await productsTable.create({
        name: 'Mechanical Keyboard',
        price: 150,
        category: 'Accessories',
    });

    // Retrieve all products
    const allProducts = await productsTable.findAll();
    console.log('All products:', allProducts);

    // Find a product by ID
    const laptop = await productsTable.findById(newProductId);
    console.log('Found laptop:', laptop);

    // Find a product by child (e.g., category)
    const electronicsProduct = await productsTable.findByChild('category', 'Electronics');
    console.log('Product in Electronics:', electronicsProduct);

    // Filter products by child (e.g., category)
    const accessoriesProducts = await productsTable.filterByChild('category', 'Accessories');
    console.log('Accessories products:', accessoriesProducts);

    // Update a product by ID
    await productsTable.transitionById(newProductId, legacyProduct => {
        if (legacyProduct) {
            return {
                ...legacyProduct,
                price: 1150,
                inStock: false
            };
        }
    });
    console.log('Laptop price and stock updated.');

    // Delete a product by ID
    // await productsTable.deleteById(newProductId);
    // console.log('Laptop deleted.');
}

manageProducts();

```

## Future Development Plan
- Add support for Realtime Listeners (onValue) for `Collection` and `Table`.
- Improve error handling and add notifications.
- Add more complex query options (e.g., limit, startAt, endAt).
- Improve performance and reduce bundle size.

## License
This project is licensed under the [MIT License](https://opensource.org/license/MIT) - see the [LICENSE](LICENSE) file for more details.
