@echo off
echo ----------START BNS_SERVER----------
@ping 127.0.0.1 -n 5 >nul

echo --------Start 1.RankingDaemon--------
START "" "C:\BNS-Server\Servers\RankingDaemon\bin\RankingDaemon.exe"
@ping 127.0.0.1 -n 15 >nul
echo --------RankingDaemon OK--------

echo --------Start 2.AccountInventoryDaemon--------
START "" "C:\BNS-Server\Servers\AccountInventoryDaemon\bin\AccountInventoryDaemon.exe"
@ping 127.0.0.1 -n 10 >nul
echo --------RankingDaemon OK--------

echo --------Start 3.CacheDaemon--------
START "" "C:\BNS-Server\Servers\CacheDaemon\bin\CacheDaemon.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------CacheDaemon OK--------

echo --------Start 4.CacheGate--------
START "" "C:\BNS-Server\Servers\CacheGate\bin\CacheGate.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------CacheGate OK--------

echo --------Start 5.PostOfficeDaemon--------
START "" "C:\BNS-Server\Servers\PostOfficeDaemon\bin\PostOfficeDaemon.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------PostOfficeDaemon OK--------

echo --------Start 6.LobbyDaemon--------
START "" "C:\BNS-Server\Servers\LobbyDaemon\bin\LobbyDaemon.exe"
@ping 127.0.0.1 -n 15 >nul
echo --------LobbyDaemon OK--------

echo --------Start 8.MarketReaderDaemon--------
START "" "C:\BNS-Server\Servers\MarketReaderDaemon\bin\MarketReaderDaemon.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------MarketReaderDaemon OK--------

echo --------Start 9.MarketReaderAgent--------
START "" "C:\BNS-Server\Servers\MarketReaderAgent\bin\MarketAgent.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------MarketReaderAgent OK--------

echo --------Start 10.MarketDealerDaemon--------
START "" "C:\BNS-Server\Servers\MarketDealerDaemon\bin\MarketDealerDaemon.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------MarketDealerDaemon OK--------

echo --------Start 11.MarketDealerAgent--------
START "" "C:\BNS-Server\Servers\MarketDealerAgent\bin\MarketAgent.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------MarketDealerAgent OK--------

echo --------Start 12.ArenaLobby--------
START "" "C:\BNS-Server\Servers\ArenaLobby\bin\ArenaLobby.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------ArenaLobby OK--------

echo --------Start 13.AchievementDaemon--------
START "" "C:\BNS-Server\Servers\AchievementDaemon\bin\AchievementDaemon.exe"
@ping 127.0.0.1 -n 25 >nul
echo --------AchievementDaemon OK--------

echo --------Start 14.DuelBotDaemon--------
START "" "C:\BNS-Server\Servers\DuelbotDaemon\bin\DuelBotDaemon.exe"
@ping 127.0.0.1 -n 25 >nul
echo --------DuelBotDaemon OK--------

echo --------Start 15.GameDaemon--------
START "" "C:\BNS-Server\Servers\GameDaemon\bin\GameDaemon.exe"
@ping 127.0.0.1 -n 180 >nul
echo --------GameDaemon OK--------

echo --------Start 16.GameDaemon_Dungeon--------
START "" "C:\BNS-Server\Servers\ArenaDaemon02\bin\GameDaemon.exe"
@ping 127.0.0.1 -n 180 >nul
echo --------GameDaemon_Dungeon OK--------

echo --------Start 16.5.GameDaemon_Arena--------
START "" "C:\BNS-Server\Servers\ArenaDaemon01\bin\GameDaemon.exe"
@ping 127.0.0.1 -n 180 >nul
echo --------GameDaemon_Arena OK--------

echo --------Start 17.InfoGateDaemon--------
START "" "C:\BNS-Server\Servers\InfoGateDaemon\bin\InfoGateDaemon.exe"
@ping 127.0.0.1 -n 10 >nul
echo --------InfoGateDaemon OK--------

echo --------Start 18.LobbyGate--------
START "" "C:\BNS-Server\Servers\LobbyGate\bin\LobbyGate.exe"
@ping 127.0.0.1 -n 8 >nul
echo --------LobbyGate OK--------

echo All Services Started
