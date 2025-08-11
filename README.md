![ViewCount](https://hits.sh/github.com/war100ck/Server-Api-BnS-Server.svg?style=flat-square)

![Dev.to blog](https://img.shields.io/badge/dev.to-0A0A0A?style=for-the-badge&logo=dev.to&logoColor=white)![MySQL](https://img.shields.io/badge/mysql-4479A1.svg?style=for-the-badge&logo=mysql&logoColor=white)![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
# Blade & Soul Game API Server 2020

This repository contains the backend API server for the **Blade & Soul** private game server. The API facilitates user registration, login, profile management, virtual currency transactions, and character management. It integrates multiple databases and provides secure and scalable routes to handle user data efficiently. **Currently, it is designed only for the 2020 version of the game.**

This API server has been tested on the server found at [RaGEZONE](https://forum.ragezone.com/threads/bns-2020-server-vm-client-simple-installation.1210163/), ensuring compatibility and performance within that specific environment.

![Server Api B&S Server](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/0-1.png)

<details>
<summary>Click to see more screenshots</summary>

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/0-2.png)

</details>

<details>
<summary>Click to explore website screenshots</summary>

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/full_page_screen.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/site-01.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/site-02.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/site-03.png)

</details>

<details>
<summary>Click to view more screenshots of the Admin Panel</summary>

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-00.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-01.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-02.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-003.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-03.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-04.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-05.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-06.png)

<hr style="border: 1px solid #ccc; margin: 10px 0;">

![2.](https://raw.githubusercontent.com/war100ck/Server-Api-BnS-Server/main/screen/admin-07.png)

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
- [Discussion](#Discussion)
- [Additions / Fixes](#additions--fixes)

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
- **Microsoft SQL Server** (***no lower than version 2017***) for handling game-related data
- **npm** (Node Package Manager)

## Installation

To set up the API server, follow these steps:

1. **Clone the repository**:

    ```bash
    git clone https://github.com/war100ck/Server-Api-BnS-Server.git
    cd Server-Api-BnS-Server
    ```

2. **Run the Database Setup Script**:

    Before installing the server, make sure to run the `add_column_webadmin.bat` script, which adds the `WebsitePassword` and `admin` column to the `Users` table in the `PlatformAcctDb` database.

    To run the script, use the following command (on Windows):

    ```bash
    add_column_webadmin.bat
    ```

    This script will:
    
    - Check if the `WebsitePassword` and `admin` column exists in the `Users` table of the `PlatformAcctDb` database.
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
      - `express`, `mssql`, `dotenv`, `axios`, `cors`, `ejs`, `argon2`, `bcrypt`, `chalk`, `express-session`, `mysql2`, `os-utils`, `pidusage`.

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

### Administrator Assignment and Permissions:

- **Initial Administrator Setup**:  
  The first web administrator is assigned directly in the database:

  **Database**: `PlatformAcctDb`  
  **Table**: `Users`  
  **Column**: `admin` (type: `bit`)  

  Set the value of the `admin` column to `1` for the corresponding user to grant them administrative privileges.

- **Adding New Administrators**:  
  Once the initial web administrator is assigned, they gain access to special features in the admin panel. This includes the ability to add or remove other administrators directly through the website, ensuring efficient and secure delegation of administrative tasks.

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

### Admin Panel Management

- **GET /admin**: Provides access to the administrative panel, where the following information is displayed:
    - List of all users from the `PlatformAcctDb` database.
    - The total number of characters created in the game from the `BlGame` database.
    - The total number of deleted characters from the game (`deletion = 1` in the `CreatureProperty` table).

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

## Discussion on Blade & Soul Game API Server

For further information and discussions related to the **Blade & Soul Game API Server** and **Game Launcher**, visit the active discussion on the forum:

[Discussion on RageZone](https://forum.ragezone.com/threads/blade-soul-game-api-server-game-launcher.1234817/)

Here you will find project details, exchange of experiences, and solutions to various technical issues related to the setup and launch of the Blade & Soul API server.

...

## Blade & Soul Game API Server for 2017

If you are looking for the **Blade & Soul** Game API Server for the 2017 version, you can download it here:

[Download Blade & Soul Game API Server 2017](https://github.com/war100ck/Server-Api-BnS-2017)

## Additions / Fixes
<details>
  <summary><b>Change Log: 12/08/2025</b></summary>

  1. **Added character blocking functionality**:  
     Implemented a system for temporary and permanent character bans with recorded reasons and durations.  
     Administrators can now effectively prevent rule violations, ensuring a fair and secure gaming environment.     
</details>


<details>
  <summary><b>Change Log: 06/08/2025</b></summary>

  > ⚠️ **Critical Update Notice**  
  > <p style="font-weight: bold; font-style: italic; color: #FF6347;">This update introduces fundamental architectural changes across the system.  
  > File names and folder structures have been significantly reorganized.  
  > **It is strongly recommended to perform a clean reinstallation** by cloning the latest version directly from the official GitHub repository.  
  > Continuing with a previously installed version may result in conflicts due to outdated or relocated files.</p>

  ---

  ### 1. New "API Configuration" Section
  A new category has been added to the admin panel, allowing real-time management of `.env` parameters through the web interface. Features include:
  - Sections: **Server Configuration**, **Database Configurations**, and **Registration Log**
  - Automatic backup of the `.env` file upon any change
  - Ability to restart the API server directly from the interface

  ### 2. Server Processes Category
  Provides tools for managing server-side daemons and individual background processes.  
  Administrators can start, stop, and monitor processes via the admin panel.

  ### 3. News Editor Module
  Introduces a user-friendly editor for managing and publishing news on the website's main page.  
  All content is controlled from the admin panel.

  ### 4. Promotions System
  Adds a system to manage promotional in-game events:
  - Manual start/stop of the **Daily Dash** (daily login reward)
  - Optional auto-renewal configuration

  ### 5. Updated Server API Updater
  Before applying any API updates via the web interface, the system now automatically backs up all affected files, allowing for safe rollback.

  ### 6. Discord Bot Integration
  Introduces automated integration with Discord:
  - Periodically sends server monitoring data to a specified Discord channel (interval configurable)
  - Supports the `/online` command in chat to view the current online player count  
  *(Requires bot creation at [Discord Developer Portal](https://discord.com/developers/applications/))*

  ### 7. Info Modals on All Pages
  Adds context-sensitive informational modals to each admin panel page for quick reference and improved user onboarding.

  ### 8. Fully Redesigned Admin Panel Interface
  The admin UI has been completely rebuilt with:
  - A refreshed design
  - Improved responsiveness and performance
  - Enhanced UX and removal of outdated components
  
   ### 9. Minor code tweaks and adjustments:  
   Made small improvements and optimizations to enhance code stability and readability.

  ---

  ### ⚙️ Important Notes
  - Before starting the server, run **`Install.bat`** to install dependencies and initialize the database.
  - Restart the API server after updating to apply all changes.
  - A clean installation is **strongly recommended** to prevent legacy file conflicts.
</details>

<details>
  <summary><b>Change Log: 13/11/2024</b></summary>

  1. **Added authentication for accessing the admin panel**:  
     Implemented a credential verification system to ensure that only authorized administrators can access the admin panel.

  2. **Added a navigation panel to the Admin Panel**:  
     Introduced a navigation bar to improve usability, providing quick access to key sections of the admin panel.

  3. **Minor code tweaks and adjustments**:  
     Made small improvements and optimizations to enhance code stability and readability.

</details>

