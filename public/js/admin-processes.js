let selectedBatFile = null;
let currentDirectory = 'D:\\StartServer';
let selectedProcesses = new Set();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Load last session data
    fetch('/api/files/last-session')
      .then(response => response.json())
      .then(data => {
        currentDirectory = data.path || 'D:\\StartServer';
        document.getElementById('currentDir').textContent = currentDirectory;

        if (data.batFile) {
          selectedBatFile = data.batFile;
          document.getElementById('selectedFileName').textContent = data.batFile;
          document.getElementById('selectedFileInfo').style.display = 'block';
          document.getElementById('loadBtn').disabled = false;
          
          // Load selected processes from server before loading the bat file
          fetch('/api/files/get-selected')
            .then(response => response.json())
            .then(selectedData => {
              if (selectedData.batFile === selectedBatFile) {
                selectedProcesses = new Set(selectedData.selectedProcesses || []);
                if (selectedData.hasSelected) {
                  document.querySelector('.container').classList.add('has-selected');
                }
              }
              loadSelectedBatFile();
            })
            .catch(error => {
              console.error('Error loading selected processes:', error);
              loadSelectedBatFile();
            });
        } else {
          loadDirectory(currentDirectory);
        }
      })
      .catch(error => {
        console.error('Error loading last session:', error);
        loadDirectory(currentDirectory);
      });

    document.getElementById('fileExplorer').style.display = 'none';
});

// Toggle explorer visibility
document.getElementById('toggleExplorerBtn').addEventListener('click', () => {
    const explorer = document.getElementById('fileExplorer');
    explorer.style.display = explorer.style.display === 'none' ? 'block' : 'none';
});

// Change selected file
document.getElementById('changeFileBtn').addEventListener('click', () => {
    document.getElementById('selectedFileInfo').style.display = 'none';
    document.getElementById('fileExplorer').style.display = 'block';
    document.getElementById('loadBtn').disabled = true;
});

// Navigation
document.getElementById('goUpBtn').addEventListener('click', () => {
    const parentDir = currentDirectory.split('\\').slice(0, -1).join('\\');
    if (parentDir.length === 2 && parentDir.endsWith(':')) {
      showDrivesList();
    } else if (parentDir) {
      navigateTo(parentDir);
    } else {
      showDrivesList();
    }
});

// Close explorer
document.getElementById('closeExplorerBtn').addEventListener('click', () => {
    document.getElementById('fileExplorer').style.display = 'none';
});

// Load processes
document.getElementById('loadBtn').addEventListener('click', loadSelectedBatFile);

// Control buttons
document.getElementById('refreshBtn').addEventListener('click', () => {
    if (selectedBatFile) loadProcesses(selectedBatFile);
});

document.getElementById('startAllBtn').addEventListener('click', startAllProcesses);
document.getElementById('stopAllBtn').addEventListener('click', stopAllProcesses);
document.getElementById('startSelectedBtn').addEventListener('click', startSelectedProcesses);
document.getElementById('stopSelectedBtn').addEventListener('click', stopSelectedProcesses);

// Show drives list
function showDrivesList() {
    showLoading('Loading drives...');
    fetch('/api/files/drives')
      .then(response => response.json())
      .then(data => {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        data.drives.forEach(drive => {
          const item = document.createElement('button');
          item.className = 'list-group-item list-group-item-action';
          item.innerHTML = `<i class="bi bi-hdd-fill text-primary"></i> ${drive}`;
          item.addEventListener('click', () => {
            navigateTo(drive);
          });
          fileList.appendChild(item);
        });
        
        document.getElementById('currentDir').textContent = 'My Computer';
        hideLoading();
      })
      .catch(error => {
        console.error('Error loading drives:', error);
        alert('Error loading drives: ' + error.message);
        hideLoading();
      });
}

// Directory navigation
function navigateTo(path) {
    showLoading('Loading file list...');
    currentDirectory = path;
    document.getElementById('currentDir').textContent = path;
    
    fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        loadDirectory(path);
      })
      .catch(error => {
        console.error('Navigation error:', error);
        hideLoading();
      });
}

// Load directory contents
function loadDirectory(path) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Directories
        data.directories.forEach(dir => {
          const item = document.createElement('button');
          item.className = 'list-group-item list-group-item-action';
          item.innerHTML = `<i class="bi bi-folder-fill text-warning"></i> ${dir}`;
          item.addEventListener('click', () => {
            navigateTo(path + '\\' + dir);
          });
          fileList.appendChild(item);
        });

        // Files
        data.files.forEach(file => {
          const item = document.createElement('button');
          item.className = `list-group-item list-group-item-action ${file.endsWith('.bat') ? 'bat-file' : ''}`;
          item.innerHTML = `<i class="bi ${file.endsWith('.bat') ? 'bi-file-earmark-code-fill text-success' : 'bi-file-earmark-fill'}"></i> ${file}`;
          
          if (file.endsWith('.bat')) {
            item.addEventListener('click', () => {
              selectedBatFile = path + '\\' + file;
              document.getElementById('selectedFileName').textContent = selectedBatFile;
              document.getElementById('selectedFileInfo').style.display = 'block';
              document.getElementById('fileExplorer').style.display = 'none';
              document.getElementById('loadBtn').disabled = false;
              document.querySelectorAll('#fileList button').forEach(btn => btn.classList.remove('active'));
              item.classList.add('active');
              
              fetch(`/api/files/list?path=${encodeURIComponent(path)}&batFile=${encodeURIComponent(selectedBatFile)}`)
                .catch(error => console.error('Error saving session:', error));
            });
          }
          
          fileList.appendChild(item);
        });
        hideLoading();
      })
      .catch(error => {
        console.error('Error loading directory:', error);
        alert('Error loading directory: ' + error.message);
        hideLoading();
      });
}

// Load selected BAT file
function loadSelectedBatFile() {
    if (!selectedBatFile) return;
    
    showLoading('Loading processes...');
    
    const dirPath = selectedBatFile.split('\\').slice(0, -1).join('\\');
    fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}&batFile=${encodeURIComponent(selectedBatFile)}`)
      .then(() => loadProcesses(selectedBatFile))
      .catch(error => console.error('Error saving session:', error));
}

// Load processes
function loadProcesses(batFilePath) {
    document.getElementById('refreshBtn').disabled = true;
    document.getElementById('refreshSpinner').style.display = 'inline-block';
    
    setTimeout(async () => {
        try {
            const response = await fetch(`/admin/processes/list?batFilePath=${encodeURIComponent(batFilePath)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const processes = await response.json();
            
            const now = new Date();
            const formattedDate = now.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const formattedTime = now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            document.getElementById('lastUpdated').textContent = `${formattedDate}, ${formattedTime}`;
            
            const totalDelay = processes.reduce((sum, p) => sum + (p.delay || 0), 0);
            document.getElementById('totalDelay').textContent = `${totalDelay} sec`;
            
            const runningCount = processes.filter(p => p.status === 'running').length;
            document.getElementById('statusCount').textContent = `${runningCount}/${processes.length} running`;
            
            renderProcesses(processes);
        } catch (error) {
            console.error('Error loading processes:', error);
            alert('Error loading processes: ' + error.message);
        } finally {
            document.getElementById('refreshBtn').disabled = false;
            document.getElementById('refreshSpinner').style.display = 'none';
            document.getElementById('startAllBtn').disabled = false;
            document.getElementById('stopAllBtn').disabled = false;
            document.getElementById('startSelectedBtn').disabled = false;
            document.getElementById('stopSelectedBtn').disabled = false;
            hideLoading();
        }
    }, 100);
}

// Start all processes
async function startAllProcesses() {
    showLoading('Preparing to start all processes...');
    document.getElementById('startAllSpinner').style.display = 'inline-block';
    document.getElementById('startAllBtn').disabled = true;
    
    try {
        const processesResponse = await fetch(`/admin/processes/list?batFilePath=${encodeURIComponent(selectedBatFile)}`);
        if (!processesResponse.ok) throw new Error('Failed to get processes list');
        const processes = await processesResponse.json();
        
        for (let i = 0; i < processes.length; i++) {
            const process = processes[i];
            updateLoadingProgress(`Starting: ${process.name} (${i+1}/${processes.length}) | Timing: ${process.timing}...`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const response = await fetch(`/admin/processes/start/${encodeURIComponent(process.name)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batFilePath: selectedBatFile }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                const result = await response.json();
                if (!result.success) {
                    updateLoadingProgress(`Failed to start ${process.name}: ${result.message}`);
                }
                
                if (process.delay > 0 && i < processes.length - 1) {
                    updateLoadingProgress(`(${process.name}) Waiting ${process.delay} seconds before next process...`);
                    await new Promise(resolve => setTimeout(resolve, process.delay * 1000));
                }
            } catch (error) {
                console.error(`Error starting process ${process.name}:`, error);
                updateLoadingProgress(`Error starting ${process.name}: ${error.message}`);
            }
        }
        
        updateLoadingProgress('Finalizing...');
        await loadProcesses(selectedBatFile);
        updateLoadingProgress('All processes started successfully!');
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('Error starting all processes:', error);
        updateLoadingProgress(`Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
        document.getElementById('startAllSpinner').style.display = 'none';
        document.getElementById('startAllBtn').disabled = false;
        hideLoading();
    }
}

// Stop all processes
async function stopAllProcesses() {
    showLoading('Stopping all processes...');
    document.getElementById('stopAllSpinner').style.display = 'inline-block';
    document.getElementById('stopAllBtn').disabled = true;
    
    try {
      const processesResponse = await fetch(`/admin/processes/list?batFilePath=${encodeURIComponent(selectedBatFile)}`);
      if (!processesResponse.ok) throw new Error('Failed to get processes list');
      const processes = await processesResponse.json();
      
      for (let i = 0; i < processes.length; i++) {
        const process = processes[i];
        updateLoadingProgress(`Stopping: ${process.name} (${i+1}/${processes.length})`);
        
        try {
          await fetch(`/admin/processes/stop/${encodeURIComponent(process.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batFilePath: selectedBatFile })
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error stopping process ${process.name}:`, error);
        }
      }
      
      loadProcesses(selectedBatFile);
    } catch (error) {
      console.error('Error stopping all processes:', error);
      alert('Error stopping processes: ' + error.message);
    } finally {
      document.getElementById('stopAllSpinner').style.display = 'none';
      document.getElementById('stopAllBtn').disabled = false;
      hideLoading();
    }
}

// Start selected processes
async function startSelectedProcesses() {
    if (selectedProcesses.size === 0) {
        alert('Please select at least one process');
        return;
    }

    showLoading('Starting selected processes...');
    document.getElementById('startSelectedSpinner').style.display = 'inline-block';
    document.getElementById('startSelectedBtn').disabled = true;
    
    try {
        const processesResponse = await fetch(`/admin/processes/list?batFilePath=${encodeURIComponent(selectedBatFile)}`);
        if (!processesResponse.ok) throw new Error('Failed to get processes list');
        const allProcesses = await processesResponse.json();
        
        const processesToStart = allProcesses
            .filter(p => selectedProcesses.has(p.name))
            .sort((a, b) => {
                return allProcesses.indexOf(a) - allProcesses.indexOf(b);
            });
        
        for (let i = 0; i < processesToStart.length; i++) {
            const process = processesToStart[i];
            updateLoadingProgress(`Starting: ${process.name} (${i+1}/${processesToStart.length}) | Timing: ${process.timing}...`);
            
            try {
                const response = await fetch(`/admin/processes/start/${encodeURIComponent(process.name)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batFilePath: selectedBatFile })
                });
                
                const result = await response.json();
                if (!result.success) {
                    updateLoadingProgress(`Failed to start ${process.name}: ${result.message}`);
                }
                
                if (process.delay > 0 && i < processesToStart.length - 1) {
                    updateLoadingProgress(`(${process.name}) Waiting ${process.delay} seconds before next process...`);
                    await new Promise(resolve => setTimeout(resolve, process.delay * 1000));
                }
            } catch (error) {
                console.error(`Error starting process ${process.name}:`, error);
                updateLoadingProgress(`Error starting ${process.name}: ${error.message}`);
            }
        }
        
        updateLoadingProgress('Finalizing...');
        await loadProcesses(selectedBatFile);
        updateLoadingProgress('Selected processes started successfully!');
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('Error starting selected processes:', error);
        updateLoadingProgress(`Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
        document.getElementById('startSelectedSpinner').style.display = 'none';
        document.getElementById('startSelectedBtn').disabled = false;
        hideLoading();
    }
}

// Stop selected processes
async function stopSelectedProcesses() {
    if (selectedProcesses.size === 0) {
        alert('Please select at least one process');
        return;
    }

    showLoading('Stopping selected processes...');
    document.getElementById('stopSelectedSpinner').style.display = 'inline-block';
    document.getElementById('stopSelectedBtn').disabled = true;
    
    try {
        const processesResponse = await fetch(`/admin/processes/list?batFilePath=${encodeURIComponent(selectedBatFile)}`);
        if (!processesResponse.ok) throw new Error('Failed to get processes list');
        const allProcesses = await processesResponse.json();
        
        const processesToStop = allProcesses.filter(p => selectedProcesses.has(p.name));
        
        for (let i = 0; i < processesToStop.length; i++) {
            const process = processesToStop[i];
            updateLoadingProgress(`Stopping: ${process.name} (${i+1}/${processesToStop.length})`);
            
            try {
                await fetch(`/admin/processes/stop/${encodeURIComponent(process.name)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batFilePath: selectedBatFile })
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error stopping process ${process.name}:`, error);
            }
        }
        
        loadProcesses(selectedBatFile);
    } catch (error) {
        console.error('Error stopping selected processes:', error);
        alert('Error stopping processes: ' + error.message);
    } finally {
        document.getElementById('stopSelectedSpinner').style.display = 'none';
        document.getElementById('stopSelectedBtn').disabled = false;
        hideLoading();
    }
}

// Display processes
function renderProcesses(processes) {
    const container = document.getElementById('processesContainer');
    
    if (!processes || processes.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i> No processes found in the selected file
          </div>
        </div>
      `;
      return;
    }

    const hasSelected = processes.some(p => p.selected);
    
    if (hasSelected) {
        document.getElementById('startSelectedBtn').disabled = false;
        document.getElementById('stopSelectedBtn').disabled = false;
        document.querySelector('.container').classList.add('has-selected');
    } else {
        document.getElementById('startSelectedBtn').disabled = true;
        document.getElementById('stopSelectedBtn').disabled = true;
        document.querySelector('.container').classList.remove('has-selected');
    }

    container.innerHTML = processes.map(process => `
      <div class="col">
        <div class="card process-card status-${process.status}">
          <div class="card-header-process">
            <div class="form-check process-title">
              <input class="form-check-input process-checkbox" type="checkbox" 
                     id="process-${process.name}" data-name="${process.name}"
                     ${process.selected ? 'checked' : ''}>
              <label class="form-check-label" for="process-${process.name}">
                <i class="bi process-status-icon ${process.status === 'running' ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
                ${process.name}
              </label>
            </div>
          </div>
          <div class="card-body-process">
            <p class="process-path">${process.path}</p>
            <div class="process-meta">
              <div class="process-timing">
                <i class="bi bi-clock"></i> ${process.timing || 'No delay'}
              </div>
              ${process.pid ? `<div class="process-pid"><i class="bi bi-hash"></i> ${process.pid}</div>` : ''}
            </div>
            <div class="process-actions">
              <span class="badge bg-${process.status === 'running' ? 'success' : 'danger'}">
                ${process.status === 'running' ? 'Running' : 'Stopped'}
              </span>
              <button class="btn btn-sm ${process.status === 'running' ? 'btn-outline-danger' : 'btn-outline-success'}" 
                      data-name="${process.name}">
                <i class="bi ${process.status === 'running' ? 'bi-stop-fill' : 'bi-play-fill'}"></i>
                ${process.status === 'running' ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const processName = e.target.getAttribute('data-name');
        const action = e.target.textContent.includes('Start') ? 'start' : 'stop';
        showLoading(`${action === 'start' ? 'Starting' : 'Stopping'} process ${processName}...`);
        
        fetch(`/admin/processes/${action}/${encodeURIComponent(processName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batFilePath: selectedBatFile })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            loadProcesses(selectedBatFile);
          } else {
            alert('Error: ' + data.message);
            hideLoading();
          }
        })
        .catch(error => {
          console.error(`Error ${action} process:`, error);
          alert(`Error ${action === 'start' ? 'starting' : 'stopping'} process: ${error.message}`);
          hideLoading();
        });
      });
    });

    container.querySelectorAll('.process-checkbox').forEach(checkbox => {
      const processName = checkbox.getAttribute('data-name');
      checkbox.checked = selectedProcesses.has(processName);
      
      checkbox.addEventListener('change', (e) => {
        const processName = e.target.getAttribute('data-name');
        if (e.target.checked) {
          selectedProcesses.add(processName);
        } else {
          selectedProcesses.delete(processName);
        }
        
        updateSelectAllCheckbox();
        saveSelectedProcesses();
        
        if (selectedProcesses.size > 0) {
          document.querySelector('.container').classList.add('has-selected');
        } else {
          document.querySelector('.container').classList.remove('has-selected');
        }
      });
    });

    updateSelectAllCheckbox();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.process-checkbox');
    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Select all checkbox handler
document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.process-checkbox');
    const shouldSelect = e.target.checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = shouldSelect;
        const processName = checkbox.getAttribute('data-name');
        if (shouldSelect) {
            selectedProcesses.add(processName);
        } else {
            selectedProcesses.delete(processName);
        }
    });
    
    saveSelectedProcesses();
    
    if (shouldSelect && checkboxes.length > 0) {
        document.querySelector('.container').classList.add('has-selected');
    } else {
        document.querySelector('.container').classList.remove('has-selected');
    }
});

// Save selected processes to config
function saveSelectedProcesses() {
    if (!selectedBatFile) return;
    
    const selected = Array.from(selectedProcesses);
    const hasSelected = selected.length > 0;
    const data = {
        batFile: selectedBatFile,
        selectedProcesses: selected,
        hasSelected: hasSelected
    };
    
    fetch('/api/files/save-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(error => console.error('Error saving selected processes:', error));

    if (hasSelected) {
        document.querySelector('.container').classList.add('has-selected');
    } else {
        document.querySelector('.container').classList.remove('has-selected');
    }
}

// Show loading indicator
function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = text || 'Loading...';
    document.getElementById('loadingProgress').textContent = '';
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}

// Update loading progress text
function updateLoadingProgress(text) {
    const progressElement = document.getElementById('loadingProgress');
    progressElement.textContent = text;
    
    progressElement.style.animation = 'none';
    progressElement.offsetHeight;
    progressElement.style.animation = 'fadeIn 0.3s ease-out';
    
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Hide loading indicator
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.opacity = '0';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}