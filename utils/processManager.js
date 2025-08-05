import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process'; // Добавляем импорт spawn

const execAsync = promisify(exec);

class ProcessManager {
  async parseBatFile(batFilePath) {
    try {
      const batContent = fs.readFileSync(batFilePath, 'utf-8');
      const processes = [];
      const lines = batContent.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('echo --------Start') && line.includes('--------')) {
          const processName = line
            .replace('echo --------Start', '')
            .replace('--------', '')
            .trim();
          
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const exeMatch = nextLine.match(/start\s+(.+\.exe)/i);
            
            if (exeMatch) {
              const exePath = exeMatch[1].replace(/"/g, '').trim();
              const exeName = path.basename(exePath, '.exe');
              
              let delaySeconds = 0;
              for (let j = i + 2; j < lines.length; j++) {
                const timingLine = lines[j].trim();
                const pingMatch = timingLine.match(/@ping 127\.0\.0\.1 -n (\d+)/);
                if (pingMatch) {
                  delaySeconds = Math.max(0, parseInt(pingMatch[1]) - 1);
                  break;
                } else if (timingLine.startsWith('echo --------') && timingLine.includes('OK--------')) {
                  break;
                }
              }
              
              processes.push({
                name: processName,
                path: exePath,
                exeName: exeName,
                delay: delaySeconds,
                timing: delaySeconds > 0 ? `${delaySeconds} sec delay` : 'No delay'
              });
            }
          }
        }
      }
      
      return processes;
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }

  async checkProcessStatus(process) {
    try {
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${process.exeName}.exe" /FO CSV /NH`
      );
      
      const lines = stdout.split('\n').filter(line => line.includes(process.exeName));
      const pids = lines.map(line => {
        const parts = line.split('","');
        return {
          pid: parts[1].replace(/"/g, ''),
          name: parts[0].replace(/"/g, ''),
          path: process.path
        };
      });
      
      // Find the process with matching path
      for (const p of pids) {
        try {
          const { stdout: wmicOutput } = await execAsync(
            `wmic process where "ProcessId=${p.pid}" get ExecutablePath`
          );
          if (wmicOutput.includes(process.path)) {
            return { status: 'running', pid: p.pid };
          }
        } catch {
          continue;
        }
      }
      
      return { status: 'stopped', pid: null };
    } catch {
      return { status: 'stopped', pid: null };
    }
  }

  async checkAllProcessesStatus(batFilePath) {
    try {
      const processes = await this.parseBatFile(batFilePath);
      const statuses = await Promise.all(
        processes.map(async p => {
          const status = await this.checkProcessStatus(p);
          return {
            ...p,
            status: status.status,
            pid: status.pid
          };
        })
      );
      return statuses;
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }

  async startProcess(batFilePath, processName) {
    try {
      const processes = await this.parseBatFile(batFilePath);
      const target = processes.find(p => p.name === processName);
      
      if (!target) {
        throw new Error(`Process "${processName}" not found`);
      }
      
      // Используем spawn для запуска процесса
      const batDir = path.dirname(batFilePath);
      const child = spawn('cmd.exe', ['/c', target.path], {
        cwd: batDir,
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref();
      return { success: true, message: `${processName} started successfully` };
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }

  async stopProcess(batFilePath, processName) {
    try {
      const processes = await this.parseBatFile(batFilePath);
      const target = processes.find(p => p.name === processName);
      
      if (!target) {
        throw new Error(`Process "${processName}" not found`);
      }
      
      const status = await this.checkProcessStatus(target);
      if (status.status === 'running' && status.pid) {
        await execAsync(`taskkill /PID ${status.pid} /F`);
        return { success: true, message: `${processName} (PID: ${status.pid}) stopped successfully` };
      }
      return { success: false, message: `${processName} is not running` };
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }

  async stopAllProcesses(batFilePath) {
    try {
      const processes = await this.parseBatFile(batFilePath);
      await Promise.all(processes.map(p => this.stopProcess(batFilePath, p.name)));
      return { success: true, message: 'All processes stopped successfully' };
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }

  async startAllProcesses(batFilePath) {
    try {
      const processes = await this.parseBatFile(batFilePath);
      const results = [];
      
      for (const process of processes) {
        try {
          await execAsync(`start "" "${process.path}"`);
          results.push({
            name: process.name,
            success: true,
            message: `${process.name} started successfully`
          });
          
          if (process.delay > 0) {
            await new Promise(resolve => 
              setTimeout(resolve, process.delay * 1000)
            );
          }
        } catch (error) {
          results.push({
            name: process.name,
            success: false,
            message: `Failed to start ${process.name}: ${error.message}`
          });
        }
      }
      
      return { 
        success: results.every(r => r.success),
        message: 'All processes started with delays',
        details: results
      };
    } catch (error) {
      console.error(`ProcessManager error: ${error.message}`);
      throw error;
    }
  }
}

export default ProcessManager;