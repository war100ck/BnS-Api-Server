# README: Setting Up the "Sending Items" Functionality

## Overview
This guide explains the steps required to set up the **"Sending Items"** functionality, which relies on the `GameItemsDB` database. This database is used to manage item categories, item names, and the filenames of item images. Additionally, the guide covers the **DonationsDb** and **CouponSystemDB** databases, which support the donation shop and coupon system functionalities.

## Requirements
1. **SQL Server**: Ensure SQL Server is installed and running.
2. **SQL Scripts**:
   - `GameItems.sql` - Creates and populates the `GameItemsDB` database.
   - `Donate.sql` - Creates and populates the `DonationsDb` database.
   - `CouponSystem.sql` - Creates and populates the `CouponSystemDB` database.
3. **Batch Files for Database Management**:
   - `restore_all_databases.bat` - Executes all SQL scripts to restore the databases.
   - `delete_databases.bat` - Deletes existing databases (`GameItemsDB`, `DonationsDb`, `CouponSystemDB`) if they exist.

4. **Incomplete Item Categories**:  
   Categories for some items are not assigned in the database. You will need to manually review and assign categories as required.

## File Locations
- The SQL scripts `GameItems.sql`, `Donate.sql`, `CouponSystem.sql`, and `update_gameitems_filenames.sql`, along with the batch files `restore_all_databases.bat` and `delete_databases.bat`, are located in the `DB` folder.
- The folder for item images is located at `\public\images\items\`.

## Purpose of the Databases
- The `GameItemsDB` database contains all the necessary information to create the **Blade & Soul Database Navigator (BNSDBN)**, a tool for efficient item management in the game.
- The `DonationsDb` database supports the donation shop system, managing user donations and the items purchased.
- The `CouponSystemDB` database handles the coupon system functionality.

## Quick Start
1. Ensure SQL Server is running.
2. Run `restore_all_databases.bat` to restore all databases:
   ```bat
   restore_all_databases.bat
   ```
   This script will automatically execute all necessary SQL scripts.

3. If you need to delete the databases (for example, for a clean reinstall), run:
   ```bat
   delete_databases.bat
   ```

## Notes
- A list of items with their corresponding ItemIDs and names was sourced from the internet.
  Please note that the names may not accurately reflect their actual in-game counterparts.
- The ItemIDs of the items were verified selectively; it's recommended to check all ItemIDs for accuracy.
- Images for the donation shop are located in the archive `public\images\shop_images.zip`.
- During the setup of items in the donation shop, images will be cached in the directory `d:\Server-Api-BnS-2017\public\images\donations\`.
- SQL Server connection credentials (login and password) are set in the batch files. If necessary, change them in `restore_all_databases.bat` and `delete_databases.bat`.

By following these steps, you will be able to set up and use the functionality to manage and send in-game items, as well as manage donations through the donation shop system and handle coupons via the coupon system.

