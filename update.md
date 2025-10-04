
<h3>Update Log</h3>

<details>
  <summary><b>Change Log: 04/10/2025</b></summary>

### 📧 Mail Monitoring
   - View sent mail between players
   - Search by username, character, or item ID
   - Display mail contents (items and gold)

### 🎁 In-Game Mail Monitoring
   - Track items in the Warehouse system
   - Filter by user and item ID
   - Manage item statuses (in mail, received, used)

### 🔧 Additional Features
   - Cache item database for fast search
   - Delete items from in-game mail
   - Automatic cache updates every 5 minutes
   - Visual indicators for item statuses and types

## Technical Details
   - Support for multiple databases (GameItemsDB, BlGame01, GameWarehouseDB)
   - Optimized SQL queries with JOINs between tables
   - Asynchronous data processing
---
### ⚙️ Important Notes ⚠️
   - Before starting the server, run **``Install.bat``** to refresh new database connections.
   - Restart the API server after updating to apply all changes.
---
</details>

<details>
  <summary><b>Change Log: 30/08/2025</b></summary>

  1. **Added new functionality in BNS API**:  
     - Promo Issue Management (create and manage campaigns)  
     - Coupon Generation (bulk/single codes)  
     - Reward System (multiple rewards per campaign)  
     - User Redemption (simple coupon redemption)  
     - Activation Tracking (monitor coupon usage)  
     - Admin Dashboard (statistics, activity, quick actions, CRUD)  
     - Advanced Features (search, bulk ops, expiration, usage limits, reset)  
     - 📬 Rewards after activation are automatically delivered to in-game mail  

  ⚙️ **Important:** After updating via the web interface, make sure to run **`install.bat`** to install dependencies and apply changes.
</details>

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