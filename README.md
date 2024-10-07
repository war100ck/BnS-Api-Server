# Blade & Soul Game API Server

This repository contains the backend API server for the **Blade & Soul** private game server. The API facilitates user registration, login, profile management, virtual currency transactions, and character management. It integrates multiple databases and provides secure and scalable routes to handle user data efficiently. **Currently, it is designed only for the 2020 version of the game.**

This API server has been tested on the server found at [RaGEZONE](https://forum.ragezone.com/threads/bns-2020-server-vm-client-simple-installation.1210163/), ensuring compatibility and performance within that specific environment.

![Server Api B&S Server](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/0-1.png)

<details>
<summary>Click to see more screenshots</summary>

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/0-2.png)

</details>

## Table of Contents

- [Key Features](#key-features)
- [Requirements](#requirements)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)
- [B&S Game Launcher](#bns-game-launcher)
- [License](#license)

## Key Features

- **User Authentication**: Secure user registration and login with email and password validation.
- **Profile Management**: Full support for viewing and updating user profiles, including character data and account information.
- **Character Management**: Tools for editing character details like faction, race, job, and other attributes.
- **Virtual Currency Transactions**: APIs to manage and add in-game currency to user accounts.
- **Database Integration**: Utilizes Microsoft SQL Server for managing user accounts, in-game data, and virtual currencies.
- **Logging**: Optional logging feature, controlled through environment variables, allows detailed logging to console for debugging and monitoring.
- **Scalability**: Designed to support a large number of users and database operations, ensuring performance and security for a Blade & Soul private server.

## Requirements

- **Node.js** (v14.0.0 or higher)
- **Microsoft SQL Server** (no lower than version 2017) for handling game-related data
- **npm** (Node Package Manager)

## Installation

To set up the API server, follow these steps:

1. **Clone the repository**:

    ```bash
    git clone https://github.com/war100ck/Server-Api-BnS-Server.git
    cd Server-Api-BnS-Server
    ```

2. **Run the Database Setup Script**:

    Before installing the server, make sure to run the `add_column_webadmin.bat` script, which adds the `WebsitePassword` column to the `Users` table in the `PlatformAcctDb` database.

    To run the script, use the following command (on Windows):

    ```bash
    add_column_webadmin.bat
    ```

    This script will:
    
    - Check if the `WebsitePassword` column exists in the `Users` table of the `PlatformAcctDb` database.
    - If the column does not exist, it will add it.
    - Confirm success or report any issues encountered during the operation.
	
3. **Run the Installation Script**:

    After running the database setup script, you can proceed to install the server. Use the provided `Install.bat` script to automatically create necessary configuration files and install all required dependencies.

    To run the script, use the following command (on Windows):

    ```bash
    Install.bat
    ```

    This script will:
    
    - Generate a `package.json` file with all the necessary npm dependencies.
    - Create `Start_Api.bat` for easy server startup.
    - Create the `.env` file with essential configuration for connecting to the game databases.
    - Install the required npm packages:
      - `express`, `mssql`, `dotenv`, `axios`, `cors`, `ejs`, `argon2`, `bcrypt`, `chalk`, `express-session`, `mysql2`, `os-utils`.

4. **Configuration**:

    After running the installation script, the `.env` file will be generated with default configurations. Make sure to adjust database credentials and other environment variables if needed:
    
    - `PLATFORM_ACCT_DB_USER`
    - `PLATFORM_ACCT_DB_PASSWORD`
    - `PLATFORM_ACCT_DB_SERVER`
    - `BLGAME_DB_USER`
    - `SERVICE_URL`

    These variables are used to connect to the Blade & Soul platform accounts, game data, and other services.

5. **Start the API Server**:

    Once everything is installed, you can start the server using the provided `Start_Api.bat` file or manually via:

    ```bash
    npm start
    ```

    The server will be accessible at `http://localhost:3000`.
	
6. **Admin Panel**:

    The admin panel for managing game-related data can be accessed via the following URL:

    ```bash
    http://<server_address>:3000/admin
    ```

    Replace `<server_address>` with the actual address of your server.
	

## API Endpoints

### User Management

- **GET /check-availability**: Checks if a username or email is available for registration.
    - Query parameters:
        - `account_name`: The desired username.
        - `email`: The user's email.
    
- **POST /signin**: Authenticates a user based on their email and password.
    - Body parameters:
        - `signin_email`: The user's email.
        - `signin_password`: The user's password.

### Profile Management

- **GET /profile**: Retrieves detailed profile information, including in-game character stats and settings.

### Character Management

- **POST /edit-character**: Allows users to edit character attributes such as:
    - Faction
    - Race
    - Job
    - In-game currency

### Deposit Management

- **POST /add-deposit**: Adds virtual currency to a user's account.

## Environment Variables

The `.env` file contains all the necessary configuration for running the server:

- **Server Configuration**:
    - `PORT`: The port on which the server will run (default: `3000`).
    - `LOG_TO_CONSOLE`: Whether to enable logging to console (`true` or `false`).

- **Database Configuration**:
    - `PLATFORM_ACCT_DB_USER`, `PLATFORM_ACCT_DB_PASSWORD`, `PLATFORM_ACCT_DB_SERVER`, `PLATFORM_ACCT_DB_DATABASE`: Credentials and details for the platform accounts database.
    - `BLGAME_DB_USER`, `BLGAME_DB_PASSWORD`, `BLGAME_DB_SERVER`, `BLGAME_DB_DATABASE`: Credentials for the in-game database (Blade & Soul).
    - `VIRTUAL_CURRENCY_DB_USER`, `VIRTUAL_CURRENCY_DB_PASSWORD`, `VIRTUAL_CURRENCY_DB_SERVER`, `VIRTUAL_CURRENCY_DB_DATABASE`: Database for managing virtual currency transactions.

## Dependencies

This project relies on the following npm packages:

- **express**: Web framework for building RESTful APIs.
- **mssql**: A library for connecting and querying Microsoft SQL Server.
- **dotenv**: Loads environment variables from a `.env` file into `process.env`.
- **axios**: A promise-based HTTP client for making requests to external services.
- **cors**: Enables Cross-Origin Resource Sharing for allowing requests from different domains.
- **ejs**: Template engine for rendering dynamic HTML.
- **argon2** and **bcrypt**: Libraries for secure password hashing.
- **chalk**: Adds colorful output for logging and debugging.
- **express-session**: Manages user sessions.
- **mysql2**: MySQL database connection support.

## BnS Game Launcher

*Note: The game launcher for this server can be downloaded from [B&S Game Launcher](https://github.com/war100ck/blade-soul-game-launcher).*

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
