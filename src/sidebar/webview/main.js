(function () {
  const vscode = acquireVsCodeApi();
  let state;
  let busy = false;

  const workspaceName = document.getElementById('workspace-name');
  const status = document.getElementById('generation-status');
  const modeMcu = document.getElementById('mode-mcu');
  const modeLinux = document.getElementById('mode-linux');
  const modeNative = document.getElementById('mode-native');
  const configuration = document.getElementById('configuration');
  const scanButton = document.getElementById('scan-workspace');
  const generateButton = document.getElementById('generate-project');
  const resultRegion = document.getElementById('result-region');
  const generatedFiles = document.getElementById('generated-files');
  const workspaceSummary = document.getElementById('workspace-summary');

  function post(message) {
    vscode.postMessage(message);
  }

  function icon(name) {
    const element = document.createElement('span');
    element.className = 'ui-icon';
    element.dataset.icon = name;
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function sectionHeader(title, description, iconName) {
    const header = document.createElement('div');
    header.className = 'section-header';
    if (iconName) {
      header.append(icon(iconName));
    }
    const copy = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = title;
    copy.append(heading);
    if (description) {
      const note = document.createElement('p');
      note.textContent = description;
      copy.append(note);
    }
    header.append(copy);
    return header;
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

  function toggleRow(label, checked, change, description, iconName) {
    const row = document.createElement('label');
    row.className = 'toggle-row';
    const leading = document.createElement('span');
    leading.className = 'toggle-leading';
    if (iconName) {
      leading.append(icon(iconName));
    }
    const text = document.createElement('span');
    text.className = 'toggle-copy';
    const title = document.createElement('span');
    title.className = 'toggle-title';
    title.textContent = label;
    text.append(title);
    if (description) {
      const detail = document.createElement('small');
      detail.className = 'field-detail';
      detail.textContent = description;
      text.append(detail);
    }
    leading.append(text);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'switch-input';
    checkbox.checked = checked;
    checkbox.disabled = busy;
    checkbox.addEventListener('change', () => change(checkbox.checked));
    const switchTrack = document.createElement('span');
    switchTrack.className = 'switch-track';
    switchTrack.append(checkbox, document.createElement('span'));
    row.append(leading, switchTrack);
    return row;
  }

  function saveSelection(selection) {
    state.selection = selection;
    post({ type: 'saveSelection', selection });
  }

  function updateFromSelection(selection) {
    state.selection = selection;
    render();
    post({ type: 'saveSelection', selection });
  }

  function quickAction(label, type, iconName) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-action';
    button.append(icon(iconName), document.createTextNode(label));
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
    const modelCard = document.createElement('section');
    modelCard.className = 'control-section target-section';
    modelCard.append(sectionHeader('目标配置', '选择构建芯片与目标系列。', 'chip'));
    const targetGrid = document.createElement('div');
    targetGrid.className = 'target-grid';
    targetGrid.append(
      selectField('厂商', state.vendors, selection.mcu.vendor, () => {}),
      selectField('系列', state.series, selection.mcu.series, (value) => {
        updateFromSelection({ ...selection, mcu: { ...selection.mcu, series: value } });
      }),
      selectField('型号', state.devices, selection.mcu.part, (value) => {
        updateFromSelection({ ...selection, mcu: { ...selection.mcu, part: value } });
      })
    );
    modelCard.append(targetGrid);

    const vendorSelect = modelCard.querySelector('select');
    if (vendorSelect) {
      vendorSelect.addEventListener('change', () => {
        updateFromSelection({ ...selection, mcu: { ...selection.mcu, vendor: vendorSelect.value } });
      });
    }
    const device = selectedOption(state.devices, selection.mcu.part);
    if (device) {
      const summary = document.createElement('div');
      summary.className = 'device-summary';
      const name = document.createElement('strong');
      name.textContent = selection.mcu.part;
      const meta = document.createElement('span');
      meta.textContent = `${device.description || ''}${device.detail ? ` · ${device.detail}` : ''}`;
      summary.append(name, meta);
      modelCard.append(summary);
    }
    panel.append(modelCard);

    const extrasSection = document.createElement('section');
    extrasSection.className = 'control-section';
    extrasSection.append(sectionHeader('附加功能', '与工程同时生成的开发工具配置。', 'extensions'));
    const toggles = document.createElement('div');
    toggles.className = 'toggle-list';
    toggles.append(
      toggleRow('生成 flash.py', selection.flash.enabled, (enabled) => {
        updateFromSelection({ ...selection, flash: { ...selection.flash, enabled } });
      }, 'OpenOCD 烧录脚本', 'zap'),
      toggleRow('Cortex-Debug', selection.debugEnabled, (enabled) => {
        updateFromSelection({ ...selection, debugEnabled: enabled });
      }, 'launch.json 调试配置', 'debug-alt')
    );
    extrasSection.append(toggles);
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-actions';
    quickActions.append(
      quickAction('仅 flash.py', 'generateFlashScript', 'zap'),
      quickAction('仅 Debug', 'generateDebugConfiguration', 'debug-alt')
    );
    extrasSection.append(quickActions);
    panel.append(extrasSection);

    const advanced = document.createElement('details');
    advanced.className = 'advanced';
    const summary = document.createElement('summary');
    summary.append(icon('settings-gear'), document.createTextNode('OpenOCD 高级选项'));
    const advancedHint = document.createElement('span');
    advancedHint.className = 'summary-hint';
    advancedHint.textContent = `${selection.flash.probeId} · ${selection.flash.targetId}`;
    summary.append(advancedHint);
    const grid = document.createElement('div');
    grid.className = 'advanced-grid';
    grid.append(
      selectField('烧录 target', state.flashTargets, selection.flash.targetId, (value) => {
        updateFromSelection({ ...selection, flash: { ...selection.flash, targetId: value } });
      }),
      selectField('调试器', state.flashProbes, selection.flash.probeId, (value) => {
        updateFromSelection({ ...selection, flash: { ...selection.flash, probeId: value } });
      })
    );
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.value = selection.flash.openocdPath;
    pathInput.disabled = busy;
    pathInput.addEventListener('change', () => {
      updateFromSelection({ ...selection, flash: { ...selection.flash, openocdPath: pathInput.value } });
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
      updateFromSelection({ ...selection, linux: { ...selection.linux, toolchainFamily: value } });
    });
    const section = document.createElement('section');
    section.className = 'control-section';
    section.append(sectionHeader('交叉工具链', '选择目标架构与编译器。', 'device-desktop'));
    section.append(toolchain);
    panel.append(section);
    const selected = selectedOption(state.linuxToolchains, selection.linux.toolchainFamily);
    if (selected) {
      const detail = document.createElement('div');
      detail.className = 'toolchain-status';
      detail.append(icon(selected.detail?.includes('Not found') ? 'warning' : 'pass'));
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = selected.description || selected.label;
      const note = document.createElement('span');
      note.textContent = selected.detail || '';
      copy.append(name, note);
      detail.append(copy);
      panel.append(detail);
    }
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = '生成器会扫描工作区源文件、头文件目录和已保存的宏定义。';
    panel.append(note);
    configuration.replaceChildren(panel);
  }

  function renderNative() {
    const panel = document.createElement('div');
    panel.className = 'configuration-panel';
    const selection = state.selection;
    const section = document.createElement('section');
    section.className = 'control-section';
    section.append(sectionHeader('桌面 C/C++', '使用本机编译器生成普通 CMake 工程。', 'code'));
    const targetType = selectField(
      '目标类型',
      [
        { value: 'executable', label: '可执行文件' },
        { value: 'static', label: '静态库' },
        { value: 'shared', label: '动态库' }
      ],
      selection.native.targetType,
      (value) => updateFromSelection({
        ...selection,
        native: { ...selection.native, targetType: value }
      })
    );
    const standards = document.createElement('div');
    standards.className = 'target-grid';
    standards.append(
      selectField(
        'C 标准',
        [
          { value: '11', label: 'C11' },
          { value: '17', label: 'C17' },
          { value: '23', label: 'C23' }
        ],
        String(selection.native.cStandard),
        (value) => updateFromSelection({
          ...selection,
          native: { ...selection.native, cStandard: Number(value) }
        })
      ),
      selectField(
        'C++ 标准',
        [
          { value: '14', label: 'C++14' },
          { value: '17', label: 'C++17' },
          { value: '20', label: 'C++20' },
          { value: '23', label: 'C++23' }
        ],
        String(selection.native.cxxStandard),
        (value) => updateFromSelection({
          ...selection,
          native: { ...selection.native, cxxStandard: Number(value) }
        })
      )
    );
    section.append(targetType, standards);
    panel.append(section);
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = '将扫描当前工作区并生成 CMakeLists.txt、Debug/Release 预设和 C/C++ IntelliSense 配置。';
    panel.append(note);
    configuration.replaceChildren(panel);
  }

  function render() {
    if (!state) return;
    workspaceName.textContent = state.workspaceName || '当前工作区';
    const mode = state.selection.mode;
    const isMcu = mode === 'mcu';
    const isNative = mode === 'native';
    modeMcu.setAttribute('aria-pressed', String(isMcu));
    modeLinux.setAttribute('aria-pressed', String(mode === 'linux'));
    modeNative.setAttribute('aria-pressed', String(isNative));
    modeMcu.disabled = busy;
    modeLinux.disabled = busy;
    modeNative.disabled = busy;
    scanButton.disabled = busy;
    generateButton.disabled = busy;
    [modeMcu, modeLinux, modeNative, scanButton, generateButton].forEach((control) => {
      control.disabled = busy;
    });
    configuration.hidden = false;
    if (isMcu) renderMcu();
    else if (isNative) renderNative();
    else renderLinux();
  }

  function setBusy(active, text) {
    busy = active;
    const statusText = status.querySelector('.status-text');
    if (statusText) statusText.textContent = text || (active ? '处理中' : '就绪');
    status.className = `status-badge${active ? ' busy' : ''}`;
    document.querySelector('.actions')?.classList.toggle('busy', active);
    render();
  }

  function result(resultValue) {
    busy = false;
    const statusText = status.querySelector('.status-text');
    if (statusText) statusText.textContent = resultValue.ok ? '已完成' : '失败';
    status.className = `status-badge ${resultValue.ok ? 'success' : 'error'}`;
    document.querySelector('.actions')?.classList.remove('busy');
    workspaceSummary.textContent = resultValue.message;
    generatedFiles.replaceChildren();
    resultRegion.hidden = resultValue.files.length === 0;
    resultValue.files.forEach((file) => {
      const item = document.createElement('li');
      item.append(icon('check'));
      const label = document.createElement('span');
      label.textContent = file;
      item.append(label);
      generatedFiles.append(item);
    });
    render();
    generateButton.focus();
  }

  modeMcu.addEventListener('click', () => {
    if (!state || busy) return;
    updateFromSelection({ ...state.selection, mode: 'mcu' });
  });

  modeLinux.addEventListener('click', () => {
    if (!state || busy) return;
    updateFromSelection({ ...state.selection, mode: 'linux' });
  });

  modeNative.addEventListener('click', () => {
    if (!state || busy) return;
    updateFromSelection({ ...state.selection, mode: 'native' });
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
      const statusText = status.querySelector('.status-text');
      if (statusText) statusText.textContent = '扫描完成';
      status.className = 'status-badge';
      workspaceSummary.textContent = `${message.sources} 个源文件 · ${message.includeDirs} 个头文件目录 · ${message.defines} 个宏`;
    } else if (message.type === 'notification') {
      const statusText = status.querySelector('.status-text');
      if (statusText) statusText.textContent = message.message;
      status.className = `status-badge ${message.level === 'error' ? 'error' : ''}`;
    }
  });

  post({ type: 'ready' });
})();
