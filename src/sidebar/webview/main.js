(function () {
  const vscode = acquireVsCodeApi();
  let state;
  let busy = false;

  const app = document.getElementById('app');
  const workspaceName = document.getElementById('workspace-name');
  const status = document.getElementById('generation-status');
  const modeMcu = document.getElementById('mode-mcu');
  const modeLinux = document.getElementById('mode-linux');
  const configuration = document.getElementById('configuration');
  const scanButton = document.getElementById('scan-workspace');
  const generateButton = document.getElementById('generate-project');
  const resultRegion = document.getElementById('result-region');
  const generatedFiles = document.getElementById('generated-files');

  function post(message) {
    vscode.postMessage(message);
  }

  function option(value, label, description) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    if (description) element.title = description;
    return element;
  }

  function field(labelText, control, detailText) {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const label = document.createElement('span');
    label.className = 'field-label';
    label.textContent = labelText;
    wrapper.append(label, control);
    if (detailText) {
      const detail = document.createElement('p');
      detail.className = 'field-detail';
      detail.textContent = detailText;
      wrapper.append(detail);
    }
    return wrapper;
  }

  function selectField(label, options, value, change) {
    const select = document.createElement('select');
    options.forEach((item) => select.append(option(item.value, item.label, item.detail)));
    select.value = value;
    select.disabled = busy;
    select.addEventListener('change', () => {
      if (!state) return;
      change(select.value);
      post({ type: 'saveSelection', selection: state.selection });
    });
    return field(label, select);
  }

  function selectedOption(options, value) {
    return options.find((item) => item.value === value);
  }

  function optionCard(label, checked, change, description) {
    const card = document.createElement('label');
    card.className = 'option-card';
    const row = document.createElement('span');
    row.className = 'option-row';
    const text = document.createElement('span');
    text.textContent = label;
    if (description) {
      const detail = document.createElement('small');
      detail.className = 'field-detail';
      detail.textContent = description;
      text.append(document.createElement('br'), detail);
    }
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.disabled = busy;
    checkbox.addEventListener('change', () => change(checkbox.checked));
    row.append(text, checkbox);
    card.append(row);
    return card;
  }

  function saveSelection(selection) {
    state.selection = selection;
    post({ type: 'saveSelection', selection });
  }

  function quickAction(label, type) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-action';
    button.textContent = label;
    button.disabled = busy;
    button.addEventListener('click', () => {
      if (!busy) post({ type });
    });
    return button;
  }

  function renderMcu() {
    const panel = document.createElement('div');
    panel.className = 'configuration-panel';
    const selection = state.selection;
    panel.append(
      selectField('厂商', state.vendors, selection.mcu.vendor, () => {}),
      selectField('系列', state.series, selection.mcu.series, (value) => {
        saveSelection({ ...selection, mcu: { ...selection.mcu, series: value } });
      }),
      selectField('型号', state.devices, selection.mcu.part, (value) => {
        saveSelection({ ...selection, mcu: { ...selection.mcu, part: value } });
      })
    );

    const vendorSelect = panel.querySelector('select');
    if (vendorSelect) {
      vendorSelect.addEventListener('change', () => {
        saveSelection({ ...selection, mcu: { ...selection.mcu, vendor: vendorSelect.value } });
      });
    }
    const device = selectedOption(state.devices, selection.mcu.part);
    if (device) {
      const detail = document.createElement('p');
      detail.className = 'field-detail';
      detail.textContent = `${device.description || ''}${device.detail ? ` · ${device.detail}` : ''}`;
      panel.append(detail);
    }

    panel.append(
      optionCard('生成 flash.py', selection.flash.enabled, (enabled) => {
        saveSelection({ ...selection, flash: { ...selection.flash, enabled } });
      }, '生成独立 OpenOCD 烧录脚本。'),
      optionCard('生成 Cortex-Debug 配置', selection.debugEnabled, (enabled) => {
        saveSelection({ ...selection, debugEnabled: enabled });
      }, '写入 .vscode/launch.json。')
    );
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-actions';
    quickActions.append(
      quickAction('仅生成 flash.py', 'generateFlashScript'),
      quickAction('仅生成 Debug 配置', 'generateDebugConfiguration')
    );
    panel.append(quickActions);

    const advanced = document.createElement('details');
    advanced.className = 'advanced';
    const summary = document.createElement('summary');
    summary.textContent = 'OpenOCD 高级选项';
    const grid = document.createElement('div');
    grid.className = 'advanced-grid';
    grid.append(
      selectField('烧录 target', state.flashTargets, selection.flash.targetId, (value) => {
        saveSelection({ ...selection, flash: { ...selection.flash, targetId: value } });
      }),
      selectField('调试器', state.flashProbes, selection.flash.probeId, (value) => {
        saveSelection({ ...selection, flash: { ...selection.flash, probeId: value } });
      })
    );
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.value = selection.flash.openocdPath;
    pathInput.disabled = busy;
    pathInput.addEventListener('change', () => {
      saveSelection({ ...selection, flash: { ...selection.flash, openocdPath: pathInput.value } });
    });
    grid.append(field('OpenOCD 路径', pathInput));
    advanced.append(summary, grid);
    panel.append(advanced);
    configuration.replaceChildren(panel);
  }

  function renderLinux() {
    const panel = document.createElement('div');
    panel.className = 'configuration-panel';
    const selection = state.selection;
    const toolchain = selectField('交叉工具链', state.linuxToolchains, selection.linux.toolchainFamily, (value) => {
      saveSelection({ ...selection, linux: { ...selection.linux, toolchainFamily: value } });
    });
    panel.append(toolchain);
    const selected = selectedOption(state.linuxToolchains, selection.linux.toolchainFamily);
    if (selected) {
      const detail = document.createElement('p');
      detail.className = 'field-detail';
      detail.textContent = [selected.description, selected.detail].filter(Boolean).join(' · ');
      panel.append(detail);
    }
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = '生成器会扫描工作区源文件、头文件目录和已保存的宏定义。';
    panel.append(note);
    configuration.replaceChildren(panel);
  }

  function render() {
    if (!state) return;
    workspaceName.textContent = state.workspaceName || '当前工作区';
    const isMcu = state.selection.mode === 'mcu';
    modeMcu.setAttribute('aria-pressed', String(isMcu));
    modeLinux.setAttribute('aria-pressed', String(!isMcu));
    modeMcu.disabled = busy;
    modeLinux.disabled = busy;
    scanButton.disabled = busy;
    generateButton.disabled = busy;
    [modeMcu, modeLinux, scanButton, generateButton].forEach((control) => {
      control.disabled = busy;
    });
    configuration.hidden = false;
    if (isMcu) renderMcu();
    else renderLinux();
  }

  function setBusy(active, text) {
    busy = active;
    status.textContent = text || (active ? '处理中' : '就绪');
    status.className = `status-badge${active ? ' busy' : ''}`;
    render();
  }

  function result(resultValue) {
    busy = false;
    status.textContent = resultValue.ok ? '已完成' : '失败';
    status.className = `status-badge ${resultValue.ok ? 'success' : 'error'}`;
    generatedFiles.replaceChildren();
    resultRegion.hidden = resultValue.files.length === 0;
    resultValue.files.forEach((file) => {
      const item = document.createElement('li');
      item.textContent = file;
      generatedFiles.append(item);
    });
    render();
    generateButton.focus();
  }

  modeMcu.addEventListener('click', () => {
    if (!state || busy) return;
    state.selection.mode = 'mcu';
    saveSelection(state.selection);
    render();
  });

  modeLinux.addEventListener('click', () => {
    if (!state || busy) return;
    state.selection.mode = 'linux';
    saveSelection(state.selection);
    render();
  });

  scanButton.addEventListener('click', () => {
    if (busy) return;
    post({ type: 'scanWorkspace' });
  });

  generateButton.addEventListener('click', () => {
    if (busy || !state) return;
    post({ type: 'generateProject' });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'state') {
      state = message.state;
      render();
    } else if (message.type === 'operationStarted') {
      setBusy(true, message.operation);
    } else if (message.type === 'operationFinished') {
      result(message.result);
    } else if (message.type === 'workspaceScan') {
      status.textContent = `${message.sources} 个源文件`;
      status.className = 'status-badge';
    } else if (message.type === 'notification') {
      status.textContent = message.message;
      status.className = `status-badge ${message.level === 'error' ? 'error' : ''}`;
    }
  });

  post({ type: 'ready' });
})();
