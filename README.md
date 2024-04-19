# Node.js Inventory Management Application

## Description

This project is a comprehensive database management system designed to facilitate seamless interactions with a MongoDB database through a web interface. It features role-based access control (RBAC), authentication, and detailed tracking of products, transactions, and user activities.

### Features

- **User Authentication:** Secure login and registration system with session management.
- **Role-Based Access Control (RBAC):** Different levels of access for Users, Editors, and Admins.
- **Product Management:** Add, edit, and view products with associated categories.
- **Transaction Management:** Record and view transaction histories.
- **Dynamic Content Rendering:** Server-side rendered views using EJS templates for a dynamic user experience.
- **Security:** Implementation of security headers and CSP via Helmet.js to enhance application security.

### Hosted here: [Heroku Hosted Site](https://ac-database-system-68c711535da4.herokuapp.com/)

## Installation

To get this project running on your local machine:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/YourUsername/YourRepositoryName.git
   cd YourRepositoryName
   
2. **Install Dependencies**
   ```bash
   npm install
   
3. **Set Environment Variables**
   Create a .env file in the root directory and update it with your database URI and other sensitive keys:
   ```plaintext
   MONGO_URI=mongodb://your_mongo_db_uri
   SECRET_KEY=your_secret_key
   
4. **Run the Application**
   ```bash
   node index.js
The application should be up and running on http://localhost:3000.

## Usage
Here are some steps on how to use the application:

- **Register a User**: Navigate to /register to create a user account.
- **Login**: Go to /login to access the system using your user credentials.
- **View Products**: Access the main page at / to see the latest products and transactions.

## License
Distributed under the MIT License. See LICENSE for more information.

Project Link: [https://github.com/AnthonyMitchellCole/DatabaseSystemProject](https://github.com/AnthonyMitchellCole/DatabaseSystemProject)

```vbnet
### Explanation

- **Description:** Provides a brief overview of what the application does.
- **Features:** Highlights the key functionalities of your application.
- **Installation:** Step-by-step guide on how to get a development environment running.
- **Usage:** Basic instructions on how to use the application after installation.
- **Contributing:** Encourages others to contribute to the project.
- **License:** Specifies the type of license the project has.
- **Contact:** Provides a method for users to reach out to the project maintainer.

This README is designed to give any new user or contributor a clear understanding of the project and how to get started with it. Adjust any sections as necessary to fit the specifics or additional requirements of your project.
