# 📁 bns-patch/ — Game Client Update Directory

⚠️ **Note**: This component is not yet implemented in the current project. It will be published separately on GitHub.

## 🎯 Purpose
This directory is designed for storing files essential for updating the game client. It includes patches, scripts, installation components, and auxiliary resources required for both automatic and manual updates of the game's client-side components.

## 📋 Contents
The `bns-patch/` directory may include the following:

- **Version Metadata File**  
  📄 `bns-patch\db\server.db.xxx.cab`  
  Contains metadata for versioning and update tracking.

- **Patch Packages**  
  📦 `bns-patch\patch\4-1.cab`, `5-1.cab`, etc.  
  Individual patch files for incremental updates.

- **Game Client Version File**  
  📝 `bns-patch\Version.ini`  
  Defines version details and download settings in the following format:

  ```ini
  [Version]
  ProductVersion=1.0.72.180 v 0

  [Download]
  Retry=3
  Wait=1000
  Version=0
  DL root=patch

  [CheckHash]
  count=0
  hash=cf97afafb557fd44c79c52c36c15ca03
  signature=fd28bdb784c95bb3047633778b160ba34f97105ecbb8934ac622a8c9551ab6a290c83e397b5eb4593d8911f8b38292e802add240ed08593ae7b84c2a6baaa529
  file0=bin\Client.exe
  value0=00000000000000000000000000000000
  ```

## ❗ Important
Ensure the structure and contents of the `bns-patch/` directory comply with the requirements of the update system to prevent errors during patch installation.