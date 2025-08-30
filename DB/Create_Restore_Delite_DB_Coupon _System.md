# 🎟️ CouponSystemDB

- **`Create_CouponSystemDB.sql`**  
  Creates the **CouponSystemDB** database and the required tables for the coupon system.

- **`Restore_CouponSystemDB_2019RTM.sql`**  
  Restores a ready-to-use coupon database. In the test configuration, **3 coupons with associated items** are already included.

- **`Delite_CouponSystemDB.sql`**  
  Deletes the **CouponSystemDB** database along with its tables and data.

## 🚀 Usage

1. Connect to **SQL Server Management Studio (SSMS)**.  
2. Run the required script:
   - To create the database — execute `Create_CouponSystemDB.sql`.
   - To restore the ready-to-use database with test coupons — execute `Restore_CouponSystemDB_2019RTM.sql`.
   - To delete the database — execute `Delite_CouponSystemDB.sql`.

## 📝 Notes

- Scripts are designed for **Microsoft SQL Server**.  
- The restored database contains **3 example coupons with items** for testing or further development.  
- Before running `Delite_CouponSystemDB.sql`, make sure the database is no longer needed, as all data will be permanently deleted.  

---

⚙️ Databases are designed for **Microsoft SQL Server 2019 (RTM)**.