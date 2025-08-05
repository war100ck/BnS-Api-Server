# README: Setting Up the "Sending Items" Functionality

## Overview
This guide explains the steps required to set up the **"Sending Items"** functionality, which relies on the `GameItemsDB` database. This database is used to manage item categories, item names, and the filenames of item images. Additionally, the guide covers the **DonationsDb** database, which supports the donation shop functionality.

## Requirements
1. **GameItemsDB.bak Backup File**:
   A backup file containing all necessary information about item categories, names, and image filenames.

2. **DonationsDb.bak Backup File**:
   A backup file for the **DonationsDb** database, which contains data related to the donation system and items purchased by users.

3. **Database Restore Script**:
   Use the `restore_databases.sql` script to restore both the `GameItemsDB` and `DonationsDb` databases from their respective backup files.  
   > **Note:** Before executing the script, make sure to update the following paths in the script:
   > - The path to the backup files: `"Path to the GameItemsDB backup file"` and `"Path to the DonationsDb backup file"`.
   > - The path for the primary data files (`.mdf`).
   > - The path for the transaction log files (`.ldf`).

   **Alternatively**, if you have made any modifications to one of the databases and do not wish to restore the other, you can restore them **individually**:
   - Restore `GameItemsDB` if you made changes related to item categories or images.
   - Restore `DonationsDb` if you made any adjustments or updates related to the donation system or user transactions.

4. **Image Files**:
   - The database includes references to image filenames, but the actual images **are not provided**.
   - You will need to either:
     - Extract the images from the game client (this can be a time-consuming process).
     - Or set a single image for all items.

5. **Setting a Unified Image**:
   To set a single image for all items in the database, execute the `update_gameitems_filenames.sql` script. This script will replace all image filenames with a default, such as `testItem.png`.

6. **Incomplete Item Categories**:  
   Categories for some items are not assigned in the database. You will need to manually review and assign categories as required.

## File Locations
- The files `GameItemsDB.bak`, `DonationsDb.bak`, `restore_databases.sql`, and `update_gameitems_filenames.sql` are located in the `DB` folder.
- The folder for item images is located at `\public\images\items\`.

## Purpose of the Databases
- The `GameItemsDB` database contains all the necessary information to create the **Blade & Soul Database Navigator (BNSDBN)**, a tool for efficient item management in the game.
- The `DonationsDb` database supports the donation shop system, managing user donations and the items purchased.

## Quick Start
1. Restore the `GameItemsDB` and `DonationsDb` databases:
   ```sql
   -- Execute the restore_databases.sql script to restore both GameItemsDB and DonationsDb
   ```
## Note
By following these steps, you will be able to set up and use the functionality to manage and send in-game items, as well as manage donations through the donation shop system.

> **Note:**  
> A list of items with their corresponding `ItemIDs` and names was sourced from the internet.  
> Please note that the names may not accurately reflect their actual in-game counterparts.  
> The `ItemIDs` of the items were verified selectively; it's recommended to check all `ItemIDs` for accuracy.  
>  
> Images for the donation shop are located in the archive `public\images\shop_images.zip`.  
> During the setup of items in the donation shop, images will be cached in the directory `d:\Server-Api-BnS-Server\public\images\donations\`.

