const body = document.body;
const btnConnected = document.getElementById('btnConnected');
const btnDisconnected = document.getElementById('btnDisconnected');
const btnAddVm = document.getElementById('btnAddVm');
const btnThemeToggle = document.getElementById('btnThemeToggle');

const btnOpenCatalog = document.getElementById('btnOpenCatalog');
const catalogTriggerLabel = document.getElementById('catalogTriggerLabel');
const catalogTriggerBadge = document.getElementById('catalogTriggerBadge');
const scenarioGalleryBackdrop = document.getElementById('scenarioGalleryBackdrop');
const btnCloseCatalog = document.getElementById('btnCloseCatalog');
const catalogSearchInput = document.getElementById('catalogSearchInput');
const catalogCategoryTabs = document.getElementById('catalogCategoryTabs');
const catalogCardsGrid = document.getElementById('catalogCardsGrid');
const catalogEmptyState = document.getElementById('catalogEmptyState');
const scenarioQuickStrip = document.getElementById('scenarioQuickStrip');
const scenarioControlBar = document.getElementById('scenarioControlBar');

const headlineText = document.getElementById('headlineText');
const subheadText = document.getElementById('subheadText');
const cpLocationLabel = document.getElementById('cpLocationLabel');
const arcBridgeBadge = document.getElementById('arcBridgeBadge');
const arcBridgeBadge2 = document.getElementById('arcBridgeBadge2');
const arcBridgeText = document.getElementById('arcBridgeText');
const arcBridgeText2 = document.getElementById('arcBridgeText2');
const dcStatusSub = document.getElementById('dcStatusSub');

const cloudDock = document.getElementById('cloudDock');
const localMgmtDock = document.getElementById('localMgmtDock');
const controlPlaneCapsule = document.getElementById('controlPlaneCapsule');

const datacenterBox = document.getElementById('datacenterBox');
const secondarySiteBox = document.getElementById('secondarySiteBox');
const primarySiteTitle = document.getElementById('primarySiteTitle');
const secondarySiteTitle = document.getElementById('secondarySiteTitle');
const secondarySiteSub = document.getElementById('secondarySiteSub');

const primaryClusterTitle = document.getElementById('primaryClusterTitle');
const primaryClusterSub = document.getElementById('primaryClusterSub');
const primaryClusterBadge = document.getElementById('primaryClusterBadge');
const secondaryClusterTitle = document.getElementById('secondaryClusterTitle');
const secondaryClusterSub = document.getElementById('secondaryClusterSub');
const secondaryClusterBadge = document.getElementById('secondaryClusterBadge');

const primaryNodesRow = document.getElementById('primaryNodesRow');
const secondaryNodesRow = document.getElementById('secondaryNodesRow');
const mgmtNodesRow = document.getElementById('mgmtNodesRow');
const mgmtClusterBox = document.getElementById('mgmtClusterBox');
const localIdentityBox = document.getElementById('localIdentityBox');
const primaryClusterEnclosure = document.getElementById('primaryClusterEnclosure');
const secondaryClusterEnclosure = document.getElementById('secondaryClusterEnclosure');
const primaryStorageBar = document.getElementById('primaryStorageBar');
const secondaryStorageBar = document.getElementById('secondaryStorageBar');
const primarySanBlock = document.getElementById('primarySanBlock');
const secondarySanBlock = document.getElementById('secondarySanBlock');
const rackAwareHeader = document.getElementById('rackAwareHeader');
const rackAwareStorageFooter = document.getElementById('rackAwareStorageFooter');

const asrCloudVmSlot = document.getElementById('asrCloudVmSlot');
const asrStandbyHint = document.getElementById('asrStandbyHint');
const asrStatusSub = document.getElementById('asrStatusSub');

const visualStage = document.getElementById('visualStage');
const canvas = document.getElementById('flowCanvas');
const ctx = canvas.getContext('2d');

// ============================================================================
// CORE APPLICATION STATE
// ============================================================================
let mode = 'connected'; // 'connected' | 'disconnected'
let scenario = 'default'; // 'default' | 'wan-outage' | 'node-failure' | 'asr' | 'hvreplica' | 'rack-aware'
let cableCut = false;
let vmCount = 3;

// Scenario-specific state
let hvSite2Nodes = 2;          // Customizable 1..4 nodes in Site B
let hvReplicationOn = false;   // Step 1: Hyper-V Replica active
let site1Offline = false;      // Site 1 disaster active (for ASR, Hyper-V Replica, or Rack-Aware Zone 1)
let rackNodesPerZone = 2;      // Customizable 1..4 equal nodes per zone (1+1, 2+2, 3+3, 4+4)
let evacuatedRecords = [];     // Stores { pill, homeBox } for smooth failback

// Scenario 7: Azure Update Manager (Cluster-Aware Updating) state
let aumCurrentNodeIdx = 0;     // 0..3 next node to patch (4 = all 4 nodes patched)
let aumBusy = false;           // True while a node is actively draining/patching
let aumUpdateDownloaded = false; // True once the single cluster update package has come down from Azure
let aumAutoTimers = [];        // Active timers so we can cancel cleanly on scenario switch

// Scenario 8: Unified Azure Policy (Public + Private Cloud) state
let policyStep = 'idle';       // 'idle' | 'audited' | 'remediated' | 'tested'
let demoAutoPlayActive = false;
let demoAutoPlayTimers = [];

// Per-cluster storage architecture: 's2d' | 'san' | 'both'
let site1StorageMode = 's2d';
let site2StorageMode = 's2d';

const BASE_WORKLOADS = [
  { name: 'App-VM-01', icon: 'icons/vm.svg', cls: '', replicable: true },
  { name: 'AKS-Node-01', icon: 'icons/aks.svg', cls: 'aks', replicable: false },
  { name: 'SQL-Srv-01', icon: 'icons/sql-mi.svg', cls: 'sql', replicable: true },
  { name: 'AKS-Node-02', icon: 'icons/aks.svg', cls: 'aks', replicable: false },
  { name: 'Web-VM-02', icon: 'icons/vm.svg', cls: '', replicable: true },
  { name: 'AKS-Node-03', icon: 'icons/aks.svg', cls: 'aks', replicable: false },
  { name: 'App-VM-03', icon: 'icons/vm.svg', cls: '', replicable: true },
  { name: 'Foundry-AI-01', icon: 'icons/ai.svg', cls: 'ai', replicable: false }
];

function buildManagementCluster() {
  if (!mgmtNodesRow) return;
  mgmtNodesRow.className = 'physical-servers-row cols-3';
  mgmtNodesRow.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const col = document.createElement('div');
    col.className = 'node-column';
    col.innerHTML = `
      <div class="node-unit mgmt-simple-unit">
        <img src="icons/azure-local.svg" alt="" class="mgmt-node-icon" />
        <span class="mgmt-simple-node-title">Node ${i}</span>
      </div>
      <div class="bus-connector" aria-hidden="true"></div>
    `;
    mgmtNodesRow.appendChild(col);
  }
}

// ============================================================================
// NODE & WORKLOAD BUILDER HELPERS
// ============================================================================
function createVmPillElement(w) {
  const div = document.createElement('div');
  div.className = `vm-pill ${w.cls || ''}`.trim();
  div.dataset.replicable = w.replicable ? 'true' : 'false';
  div.dataset.vmName = w.name;
  div.innerHTML = `<span class="run-dot"></span><img src="${w.icon}" alt="" /><span class="pill-name">${w.name}</span>`;
  return div;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(min, max, val) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function createNodeColumnElement(label, index, computeLabel = 'CPU', nvmeLabel = 'Storage', allowClickFail = false) {
  const col = document.createElement('div');
  col.className = 'node-column';
  col.dataset.nodeIndex = String(index);
  // Assign distinct randomized per-node baseline offsets for Compute & NVMe
  const cpuJitter = randInt(-11, 16);
  let nvmeJitter = randInt(-10, 17);
  if (Math.abs(nvmeJitter - cpuJitter) < 4) {
    nvmeJitter = cpuJitter >= 0 ? cpuJitter - 7 : cpuJitter + 8;
  }
  col.dataset.cpuJitter = String(cpuJitter);
  col.dataset.nvmeJitter = String(nvmeJitter);

  col.innerHTML = `
    <div class="node-unit">
      <div class="node-unit-header">
        <span class="node-id-label">${label}</span>
        <span class="power-pill"><i class="pwr-dot"></i> <span class="pwr-text">ONLINE</span></span>
      </div>
      <div class="node-workloads"></div>
      <div class="node-hardware-base">
        <div class="hw-metric-group">
          <div class="hw-metrics-row">
            <span>${computeLabel}</span>
            <span class="load-pct cpu-pct">48%</span>
          </div>
          <div class="server-load-bar"><div class="server-load-fill cpu-load-fill" style="width:48%"></div></div>
        </div>
        <div class="hw-metric-group nvme-metric-group">
          <div class="hw-metrics-row">
            <span>${nvmeLabel}</span>
            <span class="load-pct nvme-pct">41%</span>
          </div>
          <div class="server-load-bar"><div class="server-load-fill nvme-load-fill" style="width:41%"></div></div>
        </div>
        <div class="node-version-badge">OS &amp; SBE v2509 · Update Ready</div>
      </div>
    </div>
    <div class="bus-connector" aria-hidden="true"></div>
  `;

  if (allowClickFail) {
    col.querySelector('.node-unit').addEventListener('click', e => {
      if (scenario === 'node-failure') {
        e.stopPropagation();
        toggleSingleNodeFailure(col);
      } else if (scenario === 'update-manager') {
        e.stopPropagation();
        const idx = Number(col.dataset.nodeIndex || 1) - 1;
        patchSingleClusterNode(idx);
      }
    });
  }
  return col;
}

function updateContainerLoads(rowEl) {
  if (!rowEl) return;
  Array.from(rowEl.querySelectorAll('.node-column')).forEach(col => {
    const cpuBar = col.querySelector('.cpu-load-fill');
    const nvmeBar = col.querySelector('.nvme-load-fill');
    const cpuLabel = col.querySelector('.cpu-pct');
    const nvmeLabel = col.querySelector('.nvme-pct');

    if (col.classList.contains('offline')) {
      if (cpuBar) cpuBar.style.width = '0%';
      if (nvmeBar) nvmeBar.style.width = '0%';
      if (cpuLabel) cpuLabel.textContent = 'OFFLINE';
      if (nvmeLabel) nvmeLabel.textContent = 'OFFLINE';
      return;
    }

    const realVms = col.querySelectorAll('.node-workloads .vm-pill').length;
    const ghosts = col.querySelectorAll('.node-workloads .ghost-replica-pill').length;
    const cpuJ = Number(col.dataset.cpuJitter || 0) + randInt(-2, 2);
    const nvmeJ = Number(col.dataset.nvmeJitter || 0) + randInt(-2, 2);

    let cpuPct;
    let nvmePct;
    if (realVms > 0) {
      cpuPct = clamp(22, 93, 21 + realVms * 16 + cpuJ);
      nvmePct = clamp(19, 91, 18 + realVms * 14 + nvmeJ);
    } else if (ghosts > 0) {
      // Replica standby: low CPU overhead, moderate NVMe storage for synced replica VHDs
      cpuPct = clamp(6, 18, 10 + Math.round(cpuJ * 0.35));
      nvmePct = clamp(24, 54, 24 + ghosts * 8 + Math.round(nvmeJ * 0.5));
    } else {
      cpuPct = clamp(5, 15, 9 + Math.round(cpuJ * 0.3));
      nvmePct = clamp(10, 24, 15 + Math.round(nvmeJ * 0.4));
    }

    if (nvmePct === cpuPct) {
      nvmePct = clamp(12, 91, nvmePct + (nvmePct > 50 ? -7 : 7));
    }

    if (cpuBar) cpuBar.style.width = `${cpuPct}%`;
    if (nvmeBar) nvmeBar.style.width = `${nvmePct}%`;
    if (cpuLabel) cpuLabel.textContent = `${cpuPct}%`;
    if (nvmeLabel) nvmeLabel.textContent = `${nvmePct}%`;
  });
}

// Build Default 4-Node Site 1 Cluster
function buildStandardPrimaryCluster() {
  primaryNodesRow.className = 'physical-servers-row cols-4';
  primaryNodesRow.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const cpuLbl = i === 4 ? 'CPU & GPU' : 'CPU';
    const col = createNodeColumnElement(`Node ${i}`, i, cpuLbl, 'Storage', true);
    primaryNodesRow.appendChild(col);
  }
  const cols = Array.from(primaryNodesRow.children);
  BASE_WORKLOADS.forEach((w, idx) => {
    const targetCol = cols[Math.floor(idx / 2) % cols.length];
    targetCol.querySelector('.node-workloads').appendChild(createVmPillElement(w));
  });
  updateContainerLoads(primaryNodesRow);
}

// Build Site 2 Cluster for Hyper-V Replica (1..4 customizable nodes)
function buildHvReplicaSite2Cluster() {
  secondaryNodesRow.className = `physical-servers-row cols-${hvSite2Nodes}`;
  secondaryNodesRow.innerHTML = '';
  secondaryClusterTitle.textContent = `${hvSite2Nodes}-Node Cluster`;
  if (scenario === 'hvreplica') {
    secondarySiteTitle.textContent = `Site B · ${hvSite2Nodes}-Node Cluster`;
  }

  for (let i = 1; i <= hvSite2Nodes; i++) {
    const col = createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Storage', false);
    const pwrText = col.querySelector('.pwr-text');
    pwrText.textContent = site1Offline ? 'LIVE · DR' : (hvReplicationOn ? 'REPLICA' : 'STANDBY');
    secondaryNodesRow.appendChild(col);
  }

  renderHvSite2StandbyState();
}

function renderHvSite2StandbyState() {
  if (scenario !== 'hvreplica' || site1Offline) return;
  const site2Cols = Array.from(secondaryNodesRow.children);
  site2Cols.forEach(c => {
    c.querySelector('.node-workloads').innerHTML = '';
    c.querySelector('.pwr-text').textContent = hvReplicationOn ? 'REPLICA' : 'STANDBY';
  });

  if (hvReplicationOn) {
    const replicablePills = Array.from(primaryNodesRow.querySelectorAll('.vm-pill[data-replicable="true"]'));
    replicablePills.forEach((pill, idx) => {
      const destBox = site2Cols[idx % site2Cols.length].querySelector('.node-workloads');
      const ghost = document.createElement('div');
      ghost.className = 'ghost-replica-pill';
      ghost.textContent = `◌ ${pill.dataset.vmName} (Replica)`;
      destBox.appendChild(ghost);
    });
    secondaryClusterSub.textContent = 'Hyper-V Replica syncing changes every 30s / 5m / 15m';
  } else {
    site2Cols.forEach(c => {
      const hint = document.createElement('div');
      hint.className = 'idle-slot-hint';
      hint.textContent = 'Ready for replication';
      c.querySelector('.node-workloads').appendChild(hint);
    });
    secondaryClusterSub.textContent = 'Click "1. Start Hyper-V Replica" in the Demo Player above to replicate Site 1 VMs';
  }
  updateContainerLoads(secondaryNodesRow);
}

// Build Unified Rack-Aware Cluster (Equal 1..4 nodes in Zone 1 & Zone 2)
function buildRackAwareClusters() {
  primaryNodesRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
  secondaryNodesRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
  primaryNodesRow.innerHTML = '';
  secondaryNodesRow.innerHTML = '';

  const nodeWord = `${rackNodesPerZone} Node${rackNodesPerZone > 1 ? 's' : ''}`;
  primarySiteTitle.textContent = `Site 1 · Zone 1 (${nodeWord})`;
  secondarySiteTitle.textContent = `Site 2 · Zone 2 (${nodeWord})`;
  primaryClusterTitle.textContent = `Zone 1 · ${nodeWord}`;
  secondaryClusterTitle.textContent = `Zone 2 · ${nodeWord}`;

  for (let i = 1; i <= rackNodesPerZone; i++) {
    primaryNodesRow.appendChild(createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Storage', false));
    secondaryNodesRow.appendChild(createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Storage', false));
  }

  // Distribute active VMs & AKS nodes evenly across BOTH Zone 1 and Zone 2 simultaneously!
  const z1Cols = Array.from(primaryNodesRow.children);
  const z2Cols = Array.from(secondaryNodesRow.children);
  const zoneMap = [0, 0, 1, 1, 1, 0, 0, 1]; // mixes VMs, SQL, AI & AKS across both zones
  BASE_WORKLOADS.forEach((w, idx) => {
    const targetZoneCols = zoneMap[idx % zoneMap.length] === 0 ? z1Cols : z2Cols;
    const col = targetZoneCols[Math.floor(idx / 2) % targetZoneCols.length];
    col.querySelector('.node-workloads').appendChild(createVmPillElement(w));
  });

  updateContainerLoads(primaryNodesRow);
  updateContainerLoads(secondaryNodesRow);
  applyRackAwareStorageFooterText();
}

// ============================================================================
// PER-CLUSTER STORAGE ARCHITECTURE TOGGLE (S2D Only / SAN Only / S2D + SAN)
// ============================================================================
function applyRackAwareStorageFooterText() {
  if (!rackAwareStorageFooter) return;
  const raMeta = document.getElementById('rackAwareMetaText');
  if (site1StorageMode === 'san') {
    rackAwareStorageFooter.innerHTML = '⇄ Stretched Enterprise SAN Only · Synchronously Replicated Across Zone 1 &amp; Zone 2 (&lt; 5 ms Latency · Zero Data Loss)';
    rackAwareStorageFooter.setAttribute('data-tip', 'Rack-Aware SAN Only (< 5 ms)|In a Rack-Aware stretched cluster using External SAN Only, storage arrays replicate synchronously across Zone 1 & Zone 2 with a round-trip latency requirement of < 5 ms.|icons/storage.svg');
    if (raMeta) {
      raMeta.textContent = 'SAN Only (< 5 ms Latency) · Zero Data Loss';
    }
    if (scenario === 'rack-aware' && secondarySiteSub) {
      secondarySiteSub.textContent = 'Availability Zone 2 · SAN (< 5 ms)';
    }
  } else {
    rackAwareStorageFooter.innerHTML = '⇄ Single Stretched S2D Pool · Synchronously Mirrored Across Zone 1 &amp; Zone 2 (&lt; 1 ms RDMA · Zero Data Loss)';
    rackAwareStorageFooter.setAttribute('data-tip', 'Rack-Aware S2D Only (< 1 ms)|In a Rack-Aware stretched cluster using Storage Spaces Direct (S2D Only), internal NVMe drives mirror synchronously across Zone 1 & Zone 2 requiring < 1 ms RDMA round-trip latency.|icons/azure-local.svg');
    if (raMeta) {
      raMeta.textContent = 'S2D Only (< 1 ms RDMA) · Zero Data Loss';
    }
    if (scenario === 'rack-aware' && secondarySiteSub) {
      secondarySiteSub.textContent = 'Availability Zone 2 · S2D (< 1 ms)';
    }
  }
}

function applyClusterStorageMode(siteNum, nextStgMode, announce = false) {
  if (scenario === 'rack-aware') {
    // Rack-Aware clusters only support S2D Only (< 1 ms) or SAN Only (< 5 ms), never S2D + SAN combined
    if (nextStgMode === 'both') nextStgMode = 's2d';
    site1StorageMode = nextStgMode;
    site2StorageMode = nextStgMode;
  } else if (siteNum === 1) {
    site1StorageMode = nextStgMode;
  } else {
    site2StorageMode = nextStgMode;
  }

  const syncSingleSiteDom = (enclosure, s2dBar, sanBlock, toggleRoots, stgMode) => {
    if (!enclosure) return;
    enclosure.dataset.siteStorage = stgMode;
    if (s2dBar) s2dBar.hidden = stgMode === 'san';
    if (sanBlock) sanBlock.hidden = stgMode === 's2d';
    toggleRoots.forEach(toggleRoot => {
      toggleRoot.querySelectorAll('.stg-btn').forEach(btn => {
        const modeVal = btn.getAttribute('data-stg-mode');
        btn.classList.toggle('active', modeVal === stgMode);
        if (toggleRoot.closest('#rackAwareHeader')) {
          if (modeVal === 's2d') btn.textContent = 'S2D Only (<1ms)';
          if (modeVal === 'san') btn.textContent = 'SAN Only (<5ms)';
        } else {
          if (modeVal === 's2d') btn.textContent = 'S2D';
          if (modeVal === 'san') btn.textContent = 'SAN';
        }
      });
    });
  };

  syncSingleSiteDom(
    primaryClusterEnclosure,
    primaryStorageBar,
    primarySanBlock,
    Array.from(document.querySelectorAll('.storage-mode-toggle[data-storage-site="1"]')),
    site1StorageMode
  );

  syncSingleSiteDom(
    secondaryClusterEnclosure,
    secondaryStorageBar,
    secondarySanBlock,
    Array.from(document.querySelectorAll('.storage-mode-toggle[data-storage-site="2"]')),
    site2StorageMode
  );

  applyRackAwareStorageFooterText();
  setTimeout(resizeCanvas, 80);

  if (announce) {
    const isRa = scenario === 'rack-aware';
    const titles = {
      s2d: isRa ? 'Rack-Aware S2D Only (< 1 ms RDMA)' : 'Storage Spaces Direct (S2D Only)',
      san: isRa ? 'Rack-Aware SAN Only (< 5 ms Latency)' : 'External SAN Only (Disaggregated)',
      both: 'Hybrid Storage: S2D + External SAN'
    };
    const descs = {
      s2d: isRa
        ? 'Stretched S2D mirrors internal NVMe synchronously across Zone 1 & Zone 2 (requires < 1 ms RDMA round-trip latency).'
        : 'Hyperconverged internal NVMe/SSD drives pooled across cluster nodes into shared CSVs.',
      san: isRa
        ? 'Stretched SAN-only cluster across Zone 1 & Zone 2 with synchronous array replication (supports < 5 ms round-trip latency).'
        : 'Disaggregated compute nodes connected via Fibre Channel or iSCSI to an external enterprise SAN array.',
      both: 'Internal S2D NVMe pool running side-by-side with external Fibre Channel / iSCSI SAN CSVs on the same cluster.'
    };
    showToast(titles[nextStgMode], descs[nextStgMode], nextStgMode === 's2d' ? 'icons/azure-local.svg' : 'icons/storage.svg');
  }
}

document.querySelectorAll('.storage-mode-toggle').forEach(toggleGroup => {
  const siteNum = Number(toggleGroup.getAttribute('data-storage-site'));
  toggleGroup.querySelectorAll('.stg-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      applyClusterStorageMode(siteNum, btn.getAttribute('data-stg-mode'), true);
    });
  });
});

// Smooth FLIP flight for any VM / AKS pill
function flyWorkloadPill(pill, targetContainer, showRestartState = true, customDuration = 1250) {
  const firstRect = pill.getBoundingClientRect();
  const labelEl = pill.querySelector('.pill-name');
  const origName = pill.dataset.vmName || (labelEl ? labelEl.textContent.replace(/^↻\s*/, '') : '');

  targetContainer.appendChild(pill);

  if (showRestartState) {
    pill.classList.add('restarting');
    if (labelEl) labelEl.textContent = `↻ ${origName}`;
  }

  requestAnimationFrame(() => {
    const lastRect = pill.getBoundingClientRect();
    const dx = firstRect.left - lastRect.left;
    const dy = firstRect.top - lastRect.top;

    pill.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.06)` },
        { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) - 26}px) scale(1.1)`, offset: 0.5 },
        { transform: 'translate(0, 0) scale(1)' }
      ],
      {
        duration: customDuration,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    );

    if (showRestartState) {
      setTimeout(() => {
        pill.classList.remove('restarting');
        if (labelEl) labelEl.textContent = origName;
      }, 1400);
    }
  });
}

// ============================================================================
// CONNECTED / DISCONNECTED CONTROL PLANE SWITCH
// ============================================================================
function moveControlPlaneTo(targetDock, newLocationText) {
  const firstRect = controlPlaneCapsule.getBoundingClientRect();
  targetDock.appendChild(controlPlaneCapsule);
  cpLocationLabel.textContent = newLocationText;

  requestAnimationFrame(() => {
    const lastRect = controlPlaneCapsule.getBoundingClientRect();
    const dx = firstRect.left - lastRect.left;
    const dy = firstRect.top - lastRect.top;

    controlPlaneCapsule.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.08)` },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35}px) scale(1.14)`, offset: 0.5 },
        { transform: 'translate(0, 0) scale(1)' }
      ],
      {
        duration: 1450,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    );
  });
}

function setMode(nextMode) {
  if (nextMode === mode) return;

  // Cloud-only scenarios reset cleanly if switching to Disconnected Mode
  if (nextMode === 'disconnected' && (scenario === 'wan-outage' || scenario === 'asr' || scenario === 'update-manager')) {
    selectScenario('default');
  }

  mode = nextMode;

  if (mode === 'disconnected') {
    body.classList.add('disconnected');
    btnDisconnected.classList.add('active');
    btnConnected.classList.remove('active');

    if (scenario === 'default') {
      headlineText.textContent = 'Fully Air-Gapped: Apps, data, and control plane in your datacenter';
      subheadText.innerHTML = 'Zero internet required — your <strong>3-Node Management Cluster</strong> integrates with separate local <strong>AD &amp; AD FS</strong> to govern workload clusters.';
    }
    arcBridgeText.textContent = 'Local Mgmt';
    if (arcBridgeText2) arcBridgeText2.textContent = 'Local Mgmt';
    dcStatusSub.textContent = 'Tenant Workload Cluster · Managed by your local 3-Node Management Cluster';
    const sqlSub = document.getElementById('sqlServiceSub');
    const aiSub = document.getElementById('aiServiceSub');
    const ribSub = document.getElementById('servicesRibbonSub');
    if (sqlSub) sqlSub.textContent = 'SQL Server on Local VMs';
    if (aiSub) aiSub.textContent = 'Doc Intel, Vision, Lang & Translator';
    if (ribSub) ribSub.textContent = 'Disconnected Mode: Local VMs, AKS, ACR, SQL on VMs & Local AI Containers active (AVD requires Cloud)';

    document.querySelectorAll('[data-cloud-only="true"]').forEach(el => el.classList.add('cloud-only-dim'));

    setTimeout(() => {
      moveControlPlaneTo(localMgmtDock, 'Hosted Locally on 3-Node Management Cluster');
    }, 160);
  } else {
    body.classList.remove('disconnected');
    btnConnected.classList.add('active');
    btnDisconnected.classList.remove('active');

    if (scenario === 'default') {
      headlineText.textContent = 'Apps and data run in your datacenter — managed from Azure';
      subheadText.innerHTML = 'Click any icon to learn more, deploy a local VM on the cluster, or launch an interactive demo from <strong>Scenarios &amp; Demos</strong>.';
    }
    arcBridgeText.textContent = 'Azure Arc';
    if (arcBridgeText2) arcBridgeText2.textContent = 'Azure Arc';
    dcStatusSub.textContent = 'All VMs, containers & data stay on your hardware';
    const sqlSub = document.getElementById('sqlServiceSub');
    const aiSub = document.getElementById('aiServiceSub');
    const ribSub = document.getElementById('servicesRibbonSub');
    if (sqlSub) sqlSub.textContent = 'Arc-Enabled SQL on VMs';
    if (aiSub) aiSub.textContent = 'Foundry Local & Edge RAG';
    if (ribSub) ribSub.textContent = 'Supported in Connected Mode — switch to Disconnected Mode to compare';

    document.querySelectorAll('[data-cloud-only="true"]').forEach(el => el.classList.remove('cloud-only-dim'));

    moveControlPlaneTo(cloudDock, 'Unified Cloud Management & Governance');
  }

  setTimeout(resizeCanvas, 260);
  setTimeout(resizeCanvas, 820);
}

btnConnected.addEventListener('click', () => setMode('connected'));
btnDisconnected.addEventListener('click', () => setMode('disconnected'));

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isLight = body.classList.toggle('light-mode');
    btnThemeToggle.textContent = isLight ? '🌙' : '☀️';
  });
}

// ============================================================================
// SCALABLE VISUAL SCENARIO & DEMO CATALOG + GUIDED PLAYER ENGINE
// (Add future scenarios/categories here — tabs, search & cards auto-generate!)
// ============================================================================
const SCENARIO_CATALOG = [
  {
    id: 'default',
    title: 'Single-Site Overview',
    shortLabel: 'Single-Site Overview',
    bentoSub: 'Standard 4-Node Cluster',
    ruleSummary: '4-Node Cluster, S2D/SAN & Local Services',
    category: 'Architecture & Outage',
    iconHtml: '🏢',
    accent: '',
    cloudOnly: false,
    desc: 'Explore a 4-node Azure Local cluster running VMs, AKS, SQL, and Foundry Local AI—managed from Azure or air-gapped.',
    chips: ['4-Node Cluster', 'S2D / SAN Toggle', 'Connected & Air-Gapped']
  },
  {
    id: 'wan-outage',
    title: 'Internet Outage',
    shortLabel: 'Internet Outage',
    bentoSub: '30-Day Offline Survival',
    ruleSummary: '30-Day Autonomous Offline Survival',
    category: 'Architecture & Outage',
    iconHtml: '🌐',
    accent: 'accent-amber',
    cloudOnly: true,
    desc: 'Sever the WAN link to Azure Public Cloud and watch local VMs, containers, and databases keep running up to 30 days.',
    chips: ['30-Day Offline Survival', 'Zero Workload Impact']
  },
  {
    id: 'node-failure',
    title: 'Node Failure (HA)',
    shortLabel: 'Node Failure (HA)',
    bentoSub: 'Auto VM Restart',
    ruleSummary: 'Hardware Failover & Auto VM Restart',
    category: 'Resiliency & DR',
    iconHtml: '⚡',
    accent: 'accent-rose',
    cloudOnly: false,
    desc: 'Crash physical server nodes live on stage—shared S2D or SAN storage automatically restarts VMs and AKS on healthy servers.',
    chips: ['Auto VM Restart', 'Quorum Protection', 'Click-to-Fail Nodes']
  },
  {
    id: 'asr',
    title: 'Cloud DR (Site Recovery)',
    shortLabel: 'Cloud DR (Site Recovery)',
    bentoSub: 'Failover VMs to Azure',
    ruleSummary: '30s RPO Replication & Cloud Failover',
    category: 'Resiliency & DR',
    iconHtml: '<img src="icons/asr.svg" alt="" />',
    accent: 'accent-purple',
    cloudOnly: true,
    desc: 'Continuously replicate local VMs to an Azure Recovery Services Vault (30s RPO) and fail over workloads into Azure Cloud.',
    chips: ['30s Continuous RPO', 'Cloud Failover & Failback']
  },
  {
    id: 'hvreplica',
    title: '2nd Site DR Replica',
    shortLabel: '2nd Site DR Replica',
    bentoSub: 'Site 1 → Site B Failover',
    ruleSummary: 'Async Hyper-V Replica (Site 1 → Site B)',
    category: 'Resiliency & DR',
    iconHtml: '<img src="icons/azure-local.svg" alt="" />',
    accent: 'accent-emerald',
    cloudOnly: false,
    desc: 'Add an independent 2nd Azure Local site (1–4 custom nodes), start async Hyper-V Replica sync, and fail over Site 1 → Site B.',
    chips: ['Custom 1–4 Nodes', '100% On-Prem DR', 'Works Air-Gapped']
  },
  {
    id: 'rack-aware',
    title: 'Rack-Aware Cluster',
    shortLabel: 'Rack-Aware Cluster',
    bentoSub: 'Stretched Sync Zones',
    ruleSummary: 'Stretched Sync Zones (0 Data Loss)',
    category: 'Resiliency & DR',
    iconHtml: '🔗',
    accent: '',
    cloudOnly: false,
    desc: 'Stretch one single cluster across two rooms or buildings (1+1 up to 4+4) using S2D Only (< 1 ms RDMA) or SAN Only (< 5 ms) with zero-data-loss sync storage.',
    chips: ['S2D (< 1 ms) or SAN (< 5 ms)', '2 Availability Zones', '1+1 to 4+4 Layouts']
  },
  {
    id: 'update-manager',
    title: 'Update Manager',
    shortLabel: 'Update Manager',
    bentoSub: 'Zero-Downtime Patching',
    ruleSummary: 'Zero-Downtime Rolling Cluster Patching',
    category: 'Ops & Governance',
    iconHtml: '<img src="icons/updates.svg" alt="" />',
    accent: 'accent-amber',
    cloudOnly: true,
    desc: 'Orchestrate full-stack OS, agents, drivers & OEM firmware updates from Azure. Cluster-Aware Updating live-migrates VMs off each node before patching and rebooting.',
    chips: ['Live Migration (0 Downtime)', 'OS + OEM Firmware (SBE)', 'Rolling Node-by-Node']
  },
  {
    id: 'policy',
    title: 'Unified Azure Policy',
    shortLabel: 'Unified Azure Policy',
    bentoSub: 'Guest OS Security Baseline',
    ruleSummary: 'Guest OS Security Baseline (TLS 1.2 & Firewall)',
    category: 'Ops & Governance',
    iconHtml: '<img src="icons/policy.svg" alt="" />',
    accent: 'accent-purple',
    cloudOnly: false,
    desc: 'Audit and auto-remediate inside-VM Guest OS settings (TLS 1.2 & Host Firewall via Azure Machine Configuration) across Azure Public Cloud and on-premises Azure Local.',
    chips: ['Azure Machine Configuration', 'In-Guest OS Baseline', 'Auto-Remediate Drift']
  }
];

let activeCatalogCategory = 'All';
let catalogSearchQuery = '';
let c1DrawerOpen = false;
let c1DrawerCategory = 'All';

function updateCatalogTriggerButton() {
  renderScenarioControlBar();
  if (!btnOpenCatalog || !catalogTriggerLabel || !catalogTriggerBadge) return;
  const currentMeta = SCENARIO_CATALOG.find(s => s.id === scenario);
  if (scenario === 'default') {
    btnOpenCatalog.classList.remove('has-active-demo');
    catalogTriggerLabel.textContent = 'Scenarios & Demos';
    catalogTriggerBadge.textContent = String(SCENARIO_CATALOG.length);
  } else {
    btnOpenCatalog.classList.add('has-active-demo');
    catalogTriggerLabel.textContent = currentMeta ? currentMeta.shortLabel : 'Active Demo';
    catalogTriggerBadge.textContent = 'Switch';
  }
}

function renderScenarioQuickStrip() {
  renderScenarioControlBar();
}

function renderCatalogCategoryTabs() {
  if (!catalogCategoryTabs) return;
  const categories = ['All', ...new Set(SCENARIO_CATALOG.map(s => s.category))];
  catalogCategoryTabs.innerHTML = categories.map(cat => {
    const count = cat === 'All'
      ? SCENARIO_CATALOG.length
      : SCENARIO_CATALOG.filter(s => s.category === cat).length;
    const isAct = activeCatalogCategory === cat;
    const label = cat === 'All' ? 'All Demos' : cat;
    return `
      <button type="button" class="cat-filter-pill ${isAct ? 'active' : ''}" data-cat-filter="${cat}">
        <span>${label}</span>
        <span class="cat-pill-count">${count}</span>
      </button>
    `;
  }).join('');

  catalogCategoryTabs.querySelectorAll('[data-cat-filter]').forEach(pill => {
    pill.addEventListener('click', e => {
      e.stopPropagation();
      activeCatalogCategory = pill.getAttribute('data-cat-filter');
      renderCatalogCategoryTabs();
      renderCatalogCards();
    });
  });
}

function renderCatalogCards() {
  if (!catalogCardsGrid) return;
  const q = catalogSearchQuery.trim().toLowerCase();
  const filtered = SCENARIO_CATALOG.filter(item => {
    const matchesCat = activeCatalogCategory === 'All' || item.category === activeCatalogCategory;
    if (!matchesCat) return false;
    if (!q) return true;
    const haystack = `${item.title} ${item.category} ${item.desc} ${item.chips.join(' ')}`.toLowerCase();
    return haystack.includes(q);
  });

  if (catalogEmptyState) {
    catalogEmptyState.hidden = filtered.length > 0;
  }

  catalogCardsGrid.innerHTML = filtered.map(item => {
    const isActive = item.id === scenario;
    const modeTagHtml = item.cloudOnly
      ? `<span class="card-mode-tag cloud-only">☁️ Connected Mode</span>`
      : `<span class="card-mode-tag">✓ Connected &amp; Air-Gapped</span>`;

    return `
      <button type="button" class="catalog-card ${isActive ? 'active' : ''}" data-launch-scenario="${item.id}">
        <div class="card-top-meta">
          <div class="card-visual-badge ${item.accent}">${item.iconHtml}</div>
          <div class="card-badges-right">
            <span class="card-cat-tag">${item.category}</span>
            ${modeTagHtml}
          </div>
        </div>
        <div class="card-body-copy">
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
        </div>
        <div class="card-feature-chips">
          ${item.chips.map(c => `<span class="card-chip">${c}</span>`).join('')}
        </div>
        <div class="card-footer-cta">
          <span>${isActive ? '● Currently Active on Stage' : 'Launch Interactive Demo'}</span>
          <span>${isActive ? '✓' : '→'}</span>
        </div>
      </button>
    `;
  }).join('');

  catalogCardsGrid.querySelectorAll('[data-launch-scenario]').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      const targetId = card.getAttribute('data-launch-scenario');
      closeScenarioCatalog();
      selectScenario(targetId);
    });
  });
}

function openScenarioCatalog() {
  if (!scenarioGalleryBackdrop) return;
  catalogSearchQuery = '';
  if (catalogSearchInput) catalogSearchInput.value = '';
  renderCatalogCategoryTabs();
  renderCatalogCards();
  scenarioGalleryBackdrop.hidden = false;
  setTimeout(() => {
    if (catalogSearchInput) catalogSearchInput.focus();
  }, 60);
}

function closeScenarioCatalog() {
  if (!scenarioGalleryBackdrop) return;
  scenarioGalleryBackdrop.hidden = true;
}

if (btnOpenCatalog) {
  btnOpenCatalog.addEventListener('click', e => {
    e.stopPropagation();
    openScenarioCatalog();
  });
}

if (btnCloseCatalog) {
  btnCloseCatalog.addEventListener('click', e => {
    e.stopPropagation();
    closeScenarioCatalog();
  });
}

if (scenarioGalleryBackdrop) {
  scenarioGalleryBackdrop.addEventListener('click', e => {
    if (e.target === scenarioGalleryBackdrop) {
      closeScenarioCatalog();
    }
  });
}

if (catalogSearchInput) {
  catalogSearchInput.addEventListener('input', () => {
    catalogSearchQuery = catalogSearchInput.value;
    renderCatalogCards();
  });
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (scenarioGalleryBackdrop && scenarioGalleryBackdrop.hidden) {
      openScenarioCatalog();
    } else {
      closeScenarioCatalog();
    }
  } else if (e.key === 'Escape' && scenarioGalleryBackdrop && !scenarioGalleryBackdrop.hidden) {
    closeScenarioCatalog();
  }
});

function stopDemoAutoPlay() {
  demoAutoPlayActive = false;
  demoAutoPlayTimers.forEach(t => clearTimeout(t));
  demoAutoPlayTimers = [];
}

function clearAllScenarioStates() {
  stopDemoAutoPlay();
  cableCut = false;
  hvReplicationOn = false;
  site1Offline = false;
  evacuatedRecords = [];
  aumCurrentNodeIdx = 0;
  aumBusy = false;
  aumUpdateDownloaded = false;
  aumAutoTimers.forEach(t => clearTimeout(t));
  aumAutoTimers = [];
  policyStep = 'idle';

  body.classList.remove(
    'cable-cut',
    'scenario-wan-outage',
    'scenario-node-failure',
    'scenario-asr',
    'scenario-hvreplica',
    'scenario-rack-aware',
    'scenario-update-manager',
    'scenario-policy'
  );

  datacenterBox.classList.remove('site-outage');
  rackAwareHeader.hidden = true;
  rackAwareStorageFooter.hidden = true;

  // Reset ASR Cloud Bay
  asrCloudVmSlot.querySelectorAll('.vm-pill').forEach(p => p.remove());
  asrStandbyHint.style.display = '';
  asrStatusSub.textContent = 'Continuous VM replication active (30s RPO) · Standing by in Azure';

  // Rebuild clean default 4-node Site 1
  primarySiteTitle.textContent = 'Your Datacenter · 4-Node Cluster';
  primaryClusterTitle.textContent = '4-Node Cluster';
  primaryClusterSub.textContent = '';
  primaryClusterBadge.textContent = '';
  const arcLbl = mode === 'disconnected' ? 'Local Mgmt' : 'Azure Arc';
  arcBridgeText.textContent = arcLbl;
  if (arcBridgeText2) arcBridgeText2.textContent = arcLbl;
  buildStandardPrimaryCluster();
  applyClusterStorageMode(1, site1StorageMode, false);
}

function selectScenario(nextScenario) {
  clearAllScenarioStates();
  scenario = nextScenario;
  c1DrawerOpen = false;
  updateCatalogTriggerButton();

  if (scenario === 'default') {
    if (mode === 'disconnected') {
      headlineText.textContent = 'Fully Air-Gapped: Apps, data, and control plane in your datacenter';
      subheadText.innerHTML = 'Zero internet required — your <strong>3-Node Management Cluster</strong> integrates with separate local <strong>AD &amp; AD FS</strong> to govern workload clusters.';
    } else {
      headlineText.textContent = 'Apps and data run in your datacenter — managed from Azure';
      subheadText.innerHTML = 'Click <strong>Scenarios</strong> below to pick any interactive simulation, or click any component in the diagram.';
    }
    renderScenarioControlBar();
  } else if (scenario === 'wan-outage') {
    if (mode === 'disconnected') setMode('connected');
    body.classList.add('scenario-wan-outage');
    headlineText.textContent = 'Temporary Internet Outage (30-Day Offline Resiliency)';
    subheadText.innerHTML = 'Sever the WAN link to Azure — your local VMs, AKS containers, and SQL databases continue running uninterrupted.';
    renderScenarioControlBar();
  } else if (scenario === 'node-failure') {
    body.classList.add('scenario-node-failure');
    headlineText.textContent = 'Hardware Node Failure & Automatic Local HA';
    subheadText.innerHTML = 'Shared S2D or SAN storage automatically restarts VMs and AKS nodes on healthy servers when hardware fails.';
    renderScenarioControlBar();
  } else if (scenario === 'asr') {
    if (mode === 'disconnected') setMode('connected');
    body.classList.add('scenario-asr');
    primarySiteTitle.textContent = 'Site 1 · 4-Node Cluster';
    headlineText.textContent = 'Azure Site Recovery of Local VMs to Azure Cloud';
    subheadText.innerHTML = 'Continuous purple replication syncs local VMs to <strong>Azure Recovery Services Vault</strong> (30s RPO) for cloud failover.';
    renderScenarioControlBar();
  } else if (scenario === 'hvreplica') {
    body.classList.add('scenario-hvreplica');
    primarySiteTitle.textContent = 'Site 1 · 4-Node Cluster';
    secondarySiteTitle.textContent = `Site B · ${hvSite2Nodes}-Node Cluster`;
    secondarySiteSub.textContent = 'Hyper-V Replica Target Site';
    headlineText.textContent = 'Disaster Recovery to a 2nd Azure Local Site (Hyper-V Replica)';
    subheadText.innerHTML = 'Asynchronous VM replication between two independent on-premises Azure Local clusters — works Connected or Air-Gapped.';
    buildHvReplicaSite2Cluster();
    renderScenarioControlBar();
  } else if (scenario === 'rack-aware') {
    body.classList.add('scenario-rack-aware');
    rackAwareHeader.hidden = false;
    rackAwareStorageFooter.hidden = false;
    dcStatusSub.textContent = 'Availability Zone 1 (Room A)';
    headlineText.textContent = 'Stretched Rack-Aware Cluster Across Two Availability Zones';
    subheadText.innerHTML = 'Site 1 and Site 2 form <strong>one single cluster</strong> with synchronous storage (< 1 ms S2D or < 5 ms SAN) for zero-data-loss failover.';
    buildRackAwareClusters();
    applyClusterStorageMode(1, site1StorageMode, false);
    renderScenarioControlBar();
  } else if (scenario === 'update-manager') {
    if (mode === 'disconnected') setMode('connected');
    body.classList.add('scenario-update-manager');
    headlineText.textContent = 'Azure Update Manager — Zero-Downtime Rolling Cluster Patching';
    subheadText.innerHTML = 'Full-stack updates (OS + Arc agents + OEM SBE firmware) orchestrated from Azure with live VM migration across nodes.';
    initUpdateManagerScenario();
    renderScenarioControlBar();
  } else if (scenario === 'policy') {
    body.classList.add('scenario-policy');
    headlineText.textContent = 'Unified Azure Policy — Guest OS Security Baseline (Machine Configuration)';
    subheadText.innerHTML = 'Audit and auto-remediate inside-VM Guest OS settings (<strong>TLS 1.2 &amp; Host Firewall</strong>) consistently across Azure and On-Premises.';
    initPolicyScenario();
    renderScenarioControlBar();
  }

  setTimeout(resizeCanvas, 180);
  setTimeout(resizeCanvas, 680);
}

// ============================================================================
// C1 SCENARIOS CONSOLE RENDERER (OPTION P1 TWO-LINE DECK IN EXISTING C1 THEME)
// Line 1: Scenarios Hero Button + Icon + Big Title + Full Description + Clear
// Line 2: Connected Step Track (highlights progress) + [▶ Next Step] + [⏵⏵ Play All]
// ============================================================================
function renderScenarioControlBar() {
  if (!scenarioQuickStrip || !scenarioControlBar) return;

  const currentIdx = SCENARIO_CATALOG.findIndex(s => s.id === scenario);
  const currentMeta = SCENARIO_CATALOG[currentIdx >= 0 ? currentIdx : 0];
  const scenNum = (currentIdx >= 0 ? currentIdx : 0) + 1;
  const totalScen = SCENARIO_CATALOG.length;

  let stepsData = [];
  let nextActionLabel = '';
  let nextActionCmd = '';
  let canPlayAll = false;
  let extraChipsHtml = '';

  if (scenario === 'default') {
    stepsData = [
      { num: '1', label: 'Explore Live Cluster', state: 'active', attr: '' }
    ];
    nextActionLabel = '';
    nextActionCmd = '';
    canPlayAll = false;
  } else if (scenario === 'wan-outage') {
    stepsData = [
      { num: '1', label: !cableCut ? 'Cut Internet Link' : 'Internet Link Cut', state: !cableCut ? 'active' : 'done', attr: 'data-c1-wan="cut"' },
      { num: '2', label: 'Restore Cloud Link', state: cableCut ? 'active' : '', attr: 'data-c1-wan="restore"' }
    ];
    nextActionLabel = !cableCut ? '▶ Next: Cut Internet Link' : '▶ Next: Restore Cloud Link';
    nextActionCmd = 'wan-next';
    canPlayAll = true;
  } else if (scenario === 'node-failure') {
    const failedCount = primaryNodesRow.querySelectorAll('.node-column.offline').length;
    stepsData = [
      { num: '1', label: failedCount === 0 ? 'Crash Node 1' : 'Node 1 Down (HA Active)', state: failedCount === 0 ? 'active' : 'done', attr: 'data-c1-ha="fail1"' },
      { num: '2', label: failedCount >= 2 ? '2 Nodes Down (Quorum Held)' : 'Crash Node 2', state: failedCount === 1 ? 'active' : (failedCount >= 2 ? 'done' : ''), attr: 'data-c1-ha="fail2"' },
      { num: '3', label: 'Recover All Nodes', state: failedCount >= 2 ? 'active' : '', attr: 'data-c1-ha="recover"' }
    ];
    if (failedCount === 0) nextActionLabel = '▶ Next: Crash Node 1';
    else if (failedCount === 1) nextActionLabel = '▶ Next: Crash Node 2';
    else nextActionLabel = '▶ Next: Recover Nodes';
    nextActionCmd = 'ha-next';
    canPlayAll = true;
  } else if (scenario === 'asr') {
    stepsData = [
      { num: '1', label: 'Replicating (30s RPO)', state: 'done', attr: '' },
      { num: '2', label: !site1Offline ? 'Failover to Azure Cloud' : 'Running in Azure Cloud', state: !site1Offline ? 'active' : 'done', attr: 'data-c1-asr="failover"' },
      { num: '3', label: 'Failback On-Premises', state: site1Offline ? 'active' : '', attr: 'data-c1-asr="failback"' }
    ];
    nextActionLabel = !site1Offline ? '▶ Next: Failover to Cloud' : '▶ Next: Failback On-Premises';
    nextActionCmd = 'asr-next';
    canPlayAll = true;
  } else if (scenario === 'hvreplica') {
    extraChipsHtml = `
      <div class="c1-inline-chips" title="Site B Node Count">
        <span class="c1-chip-prefix">Site B:</span>
        ${[1, 2, 3, 4].map(n => `<button class="c1-mini-chip ${hvSite2Nodes === n ? 'active' : ''}" data-s2-count="${n}" type="button">${n}N</button>`).join('')}
      </div>
    `;
    const s1Active = !hvReplicationOn && !site1Offline;
    const s2Active = hvReplicationOn && !site1Offline;
    const s3Active = site1Offline;
    stepsData = [
      { num: '1', label: s1Active ? 'Start Replication' : 'Replicating to Site B', state: s1Active ? 'active' : 'done', attr: 'data-c1-hv="start"' },
      { num: '2', label: s3Active ? 'Running on Site B' : 'Failover to Site B', state: s2Active ? 'active' : (s3Active ? 'done' : ''), attr: 'data-c1-hv="failover"' },
      { num: '3', label: 'Failback to Site A', state: s3Active ? 'active' : '', attr: 'data-c1-hv="failback"' }
    ];
    if (s1Active) nextActionLabel = '▶ Next: Start Replication';
    else if (s2Active) nextActionLabel = '▶ Next: Failover to Site B';
    else nextActionLabel = '▶ Next: Failback to Site A';
    nextActionCmd = 'hv-next';
    canPlayAll = true;
  } else if (scenario === 'rack-aware') {
    extraChipsHtml = `
      <div class="c1-inline-chips" title="Availability Zone Node Layout">
        <span class="c1-chip-prefix">Zones:</span>
        ${[1, 2, 3, 4].map(n => `<button class="c1-mini-chip ${rackNodesPerZone === n ? 'active' : ''}" data-ra-count="${n}" type="button">${n}+${n}</button>`).join('')}
      </div>
    `;
    stepsData = [
      { num: '1', label: 'Synchronous Copy Active', state: 'done', attr: '' },
      { num: '2', label: !site1Offline ? 'Simulate Zone 1 Outage' : 'Zone 1 Down (Zero Loss)', state: !site1Offline ? 'active' : 'done', attr: 'data-c1-ra="fail"' },
      { num: '3', label: 'Recover Zone 1', state: site1Offline ? 'active' : '', attr: 'data-c1-ra="recover"' }
    ];
    nextActionLabel = !site1Offline ? '▶ Next: Fail Zone 1' : '▶ Next: Recover Zone 1';
    nextActionCmd = 'ra-next';
    canPlayAll = true;
  } else if (scenario === 'update-manager') {
    const patchedCount = primaryNodesRow.querySelectorAll('.node-column.patched-node').length;
    const allDone = patchedCount >= 4;
    stepsData = [
      { num: '1', label: aumUpdateDownloaded || patchedCount > 0 ? 'Downloaded Once' : 'Download Update', state: (aumUpdateDownloaded || patchedCount > 0) ? 'done' : 'active', attr: 'data-c1-aum="single"' },
      { num: '2', label: allDone ? '4/4 Nodes v2610' : `Drain & Patch (${patchedCount}/4)`, state: (!allDone && (aumUpdateDownloaded || patchedCount > 0 || aumBusy)) ? 'active' : (allDone ? 'done' : ''), attr: 'data-c1-aum="single"' },
      { num: '3', label: 'Cluster Healthy', state: allDone ? 'active' : '', attr: 'data-c1-aum="reset"' }
    ];
    if (aumBusy) {
      nextActionLabel = `⏳ Updating Node ${Math.min(aumCurrentNodeIdx + 1, 4)}/4...`;
    } else if (allDone) {
      nextActionLabel = '↺ Replay Update';
    } else {
      nextActionLabel = `▶ Next: Patch Node ${Math.min(aumCurrentNodeIdx + 1, 4)}/4`;
    }
    nextActionCmd = 'aum-next';
    canPlayAll = true;
  } else if (scenario === 'policy') {
    const s1Act = policyStep === 'idle';
    const s2Act = policyStep === 'audited';
    const s3Act = policyStep === 'remediated';
    const sDone = policyStep === 'tested';
    stepsData = [
      { num: '1', label: s1Act ? 'Audit OS Baseline' : 'Audited (3 OS Drifted)', state: s1Act ? 'active' : 'done', attr: 'data-c1-pol="audit"' },
      { num: '2', label: (s3Act || sDone) ? 'OS Drift Remediated' : 'Remediate Guest OS', state: s2Act ? 'active' : ((s3Act || sDone) ? 'done' : ''), attr: 'data-c1-pol="fix"' },
      { num: '3', label: sDone ? 'New VM Auto-Hardened' : 'Deploy VM & Auto-Harden', state: s3Act ? 'active' : (sDone ? 'done' : ''), attr: 'data-c1-pol="test"' }
    ];
    if (s1Act) nextActionLabel = '▶ Next: Audit OS Baseline';
    else if (s2Act) nextActionLabel = '▶ Next: Remediate Drift';
    else if (s3Act) nextActionLabel = '▶ Next: Deploy & Harden VM';
    else nextActionLabel = '↺ Replay Policy Demo';
    nextActionCmd = 'pol-next';
    canPlayAll = true;
  }

  const stepperNodesHtml = stepsData.map((st, idx) => {
    const connHtml = idx < stepsData.length - 1
      ? `<span class="c1-step-connector ${st.state === 'done' ? 'done' : ''}"></span>`
      : '';
    const checkOrNum = st.state === 'done' ? '✓' : st.num;
    return `
      <button type="button" class="c1-step-box ${st.state}" ${st.attr} ${aumBusy ? 'disabled' : ''}>
        <span class="c1-step-num">${checkOrNum}</span>
        <span class="c1-step-label">${st.label}</span>
      </button>
      ${connHtml}
    `;
  }).join('');

  const clearBtnHtml = scenario !== 'default'
    ? `<button type="button" class="c1-clear-btn" data-c1-clear-default="true" title="Exit scenario and return to Single-Site Overview">✕ Clear</button>`
    : '';

  const nextBtnHtml = nextActionLabel
    ? `<button type="button" class="c1-next-step-btn" data-c1-next-action="${nextActionCmd}" ${aumBusy ? 'disabled' : ''}>
        ${nextActionLabel}
      </button>`
    : '';

  const playAllBtnHtml = canPlayAll
    ? `<button type="button" class="c1-playall-btn ${demoAutoPlayActive || aumBusy ? 'playing' : ''}" data-c1-play-all="true" ${aumBusy ? 'disabled' : ''}>
        ${demoAutoPlayActive ? '⏹ Stop' : '⏵⏵ Play All'}
      </button>`
    : '';

  // Render Two-Row Option P1 Layout inside #scenarioQuickStrip
  scenarioQuickStrip.innerHTML = `
    <!-- ROW 1: Scenarios Hero Button + Selected Scenario Title & Description + Clear -->
    <div class="c1-row-top">
      <div class="c1-left-group">
        <button type="button" id="c1HeroScenariosBtn" class="c1-scenarios-hero-btn" title="Open Scenarios & Demos Catalog (Ctrl+K)">
          <span class="c1-spark">✨</span>
          <div class="c1-scenarios-hero-text">
            <strong>Scenarios</strong>
            <small>Browse ${totalScen} Demos</small>
          </div>
          <span class="c1-caret">⊞</span>
        </button>

        <div class="c1-selected-info">
          <div class="c1-sel-icon">${currentMeta.iconHtml}</div>
          <div class="c1-sel-text">
            <div class="c1-sel-headline-row">
              <span class="c1-sel-name">${currentMeta.title}</span>
              <span class="c1-sel-eyebrow">Scenario ${scenNum} of ${totalScen}</span>
            </div>
            <span class="c1-sel-rule">${currentMeta.ruleSummary}</span>
          </div>
        </div>
      </div>

      <div class="c1-top-right">
        ${extraChipsHtml}
        ${clearBtnHtml}
      </div>
    </div>

    <!-- ROW 2: Connected Step Track (Left) + Unified Next Step & Play All (Right) -->
    <div class="c1-row-bottom">
      <div class="c1-stepper-track">
        ${stepperNodesHtml}
      </div>

      <div class="c1-transport-controls">
        ${nextBtnHtml}
        ${playAllBtnHtml}
      </div>
    </div>
  `;

  // Always keep inline drawer hidden — clicking Scenarios opens the big Bento Modal!
  scenarioControlBar.hidden = true;
  scenarioControlBar.innerHTML = '';

  // Wire up C1 Hero Scenarios Button -> Open Big Bento Catalog Modal
  const heroBtn = document.getElementById('c1HeroScenariosBtn');
  if (heroBtn) {
    heroBtn.addEventListener('click', e => {
      e.stopPropagation();
      openScenarioCatalog();
    });
  }

  // Wire up Open Catalog step on default scenario
  const openDrawerStep = scenarioQuickStrip.querySelector('[data-c1-open-drawer]');
  if (openDrawerStep) {
    openDrawerStep.addEventListener('click', e => {
      e.stopPropagation();
      openScenarioCatalog();
    });
  }

  // Wire up Clear / Back to Default button
  const clearDefaultBtn = scenarioQuickStrip.querySelector('[data-c1-clear-default]');
  if (clearDefaultBtn) {
    clearDefaultBtn.addEventListener('click', () => {
      selectScenario('default');
    });
  }

  scenarioQuickStrip.querySelectorAll('[data-c1-quick-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectScenario(btn.getAttribute('data-c1-quick-jump'));
    });
  });

  // Helper to execute the next step in sequence for the active scenario
  function triggerNextScenarioStep() {
    if (scenario === 'default') {
      openScenarioCatalog();
    } else if (scenario === 'wan-outage') {
      cableCut = !cableCut;
      body.classList.toggle('cable-cut', cableCut);
      arcBridgeText.textContent = cableCut ? 'Offline Survival (Up to 30 Days)' : 'Connected via Azure Arc';
      renderScenarioControlBar();
      showToast(
        cableCut ? 'Internet Disconnected — VMs Still Running!' : 'Internet Link Restored',
        cableCut
          ? 'Azure Local tolerates up to 30 days offline while all local VMs, AKS clusters, and SQL workloads keep running.'
          : 'Azure Arc reconnected and synced health telemetry back to Azure Cloud.',
        'icons/azure-arc.svg'
      );
    } else if (scenario === 'node-failure') {
      const onlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
      const offlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column.offline'));
      if (offlineCols.length === 0 && onlineCols[0]) {
        toggleSingleNodeFailure(onlineCols[0]);
      } else if (offlineCols.length === 1 && onlineCols.length > 2) {
        toggleSingleNodeFailure(onlineCols[0]);
      } else if (offlineCols.length > 0) {
        offlineCols.forEach(col => toggleSingleNodeFailure(col));
      }
    } else if (scenario === 'asr') {
      triggerAsrFailoverToggle();
    } else if (scenario === 'hvreplica') {
      if (!hvReplicationOn && !site1Offline) {
        hvReplicationOn = true;
        renderHvSite2StandbyState();
        renderScenarioControlBar();
        showToast(
          'Hyper-V Replica Started (Site 1 → Site B)',
          `VMs in Site 1 are now asynchronously replicating across to your ${hvSite2Nodes}-node Site B cluster.`,
          'icons/azure-local.svg'
        );
      } else {
        triggerHvReplicaFailoverToggle();
      }
    } else if (scenario === 'rack-aware') {
      triggerRackAwareZoneFailoverToggle();
    } else if (scenario === 'update-manager') {
      const patchedCount = primaryNodesRow.querySelectorAll('.node-column.patched-node').length;
      if (patchedCount >= 4) {
        initUpdateManagerScenario();
        renderScenarioControlBar();
      } else {
        patchSingleClusterNode(aumCurrentNodeIdx);
      }
    } else if (scenario === 'policy') {
      if (policyStep === 'idle') {
        runPolicyAuditScan();
      } else if (policyStep === 'audited') {
        runPolicyAutoRemediation();
      } else if (policyStep === 'remediated') {
        simulatePolicyBlockedDeploy();
      } else {
        initPolicyScenario();
        renderScenarioControlBar();
      }
    }
  }

  // Wire up Unified "▶ Next Step" Button
  const nextActionBtn = scenarioQuickStrip.querySelector('[data-c1-next-action]');
  if (nextActionBtn) {
    nextActionBtn.addEventListener('click', () => {
      stopDemoAutoPlay();
      triggerNextScenarioStep();
    });
  }

  // Wire up "⏵⏵ Play All" Button
  const playAllBtn = scenarioQuickStrip.querySelector('[data-c1-play-all]');
  if (playAllBtn) {
    playAllBtn.addEventListener('click', () => {
      if (demoAutoPlayActive) {
        stopDemoAutoPlay();
        renderScenarioControlBar();
        return;
      }
      if (scenario === 'update-manager') {
        const patchedCount = primaryNodesRow.querySelectorAll('.node-column.patched-node').length;
        if (patchedCount >= 4) initUpdateManagerScenario();
        runFullRollingClusterUpdate();
        return;
      }

      stopDemoAutoPlay();
      demoAutoPlayActive = true;

      // Reset current scenario to Step 1 and play through all steps automatically
      const scheduleSteps = (delays) => {
        renderScenarioControlBar();
        delays.forEach((ms, idx) => {
          const t = setTimeout(() => {
            if (!demoAutoPlayActive) return;
            triggerNextScenarioStep();
            if (idx === delays.length - 1) {
              demoAutoPlayActive = false;
              renderScenarioControlBar();
            }
          }, ms);
          demoAutoPlayTimers.push(t);
        });
      };

      if (scenario === 'wan-outage') {
        cableCut = false;
        body.classList.remove('cable-cut');
        scheduleSteps([300, 3200]);
      } else if (scenario === 'node-failure') {
        const offlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column.offline'));
        offlineCols.forEach(col => toggleSingleNodeFailure(col));
        scheduleSteps([300, 2800, 5600]);
      } else if (scenario === 'asr') {
        if (site1Offline) triggerAsrFailoverToggle();
        scheduleSteps([400, 3800]);
      } else if (scenario === 'hvreplica') {
        if (site1Offline) triggerHvReplicaFailoverToggle();
        hvReplicationOn = false;
        scheduleSteps([250, 2600, 5600]);
      } else if (scenario === 'rack-aware') {
        if (site1Offline) triggerRackAwareZoneFailoverToggle();
        scheduleSteps([400, 3600]);
      } else if (scenario === 'policy') {
        initPolicyScenario();
        scheduleSteps([300, 2400, 4800]);
      }
    });
  }

  // WAN Outage step handlers
  scenarioQuickStrip.querySelectorAll('[data-c1-wan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-wan');
      cableCut = (action === 'cut');
      body.classList.toggle('cable-cut', cableCut);
      arcBridgeText.textContent = cableCut ? 'Offline Survival (Up to 30 Days)' : 'Connected via Azure Arc';
      renderScenarioControlBar();
      showToast(
        cableCut ? 'Internet Disconnected — VMs Still Running!' : 'Internet Link Restored',
        cableCut
          ? 'Azure Local tolerates up to 30 days offline while all local VMs, AKS clusters, and SQL workloads keep running.'
          : 'Azure Arc reconnected and synced health telemetry back to Azure Cloud.',
        'icons/azure-arc.svg'
      );
    });
  });

  // Node Failure (HA) step handlers
  scenarioQuickStrip.querySelectorAll('[data-c1-ha]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-ha');
      const onlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
      const offlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column.offline'));
      if (action === 'fail1' && onlineCols[0]) {
        toggleSingleNodeFailure(onlineCols[0]);
      } else if (action === 'fail2' && onlineCols.length > 2) {
        toggleSingleNodeFailure(onlineCols[0]);
      } else if (action === 'recover' && offlineCols.length > 0) {
        offlineCols.forEach(col => toggleSingleNodeFailure(col));
      }
    });
  });

  // Cloud DR (ASR) step handlers
  scenarioQuickStrip.querySelectorAll('[data-c1-asr]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-asr');
      if ((action === 'failover' && !site1Offline) || (action === 'failback' && site1Offline)) {
        triggerAsrFailoverToggle();
      }
    });
  });

  // 2nd Site DR (Hyper-V Replica) step handlers
  scenarioQuickStrip.querySelectorAll('[data-s2-count]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (site1Offline) {
        showToast('Failback First', 'Fail back VMs to Site 1 before resizing Site B hardware.', 'icons/azure-local.svg');
        return;
      }
      hvSite2Nodes = Number(chip.getAttribute('data-s2-count'));
      buildHvReplicaSite2Cluster();
      renderScenarioControlBar();
      setTimeout(resizeCanvas, 150);
    });
  });

  scenarioQuickStrip.querySelectorAll('[data-c1-hv]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-hv');
      if (action === 'start') {
        hvReplicationOn = true;
        renderHvSite2StandbyState();
        renderScenarioControlBar();
        showToast(
          'Hyper-V Replica Started (Site 1 → Site B)',
          `VMs in Site 1 are now asynchronously replicating across to your ${hvSite2Nodes}-node Site B cluster.`,
          'icons/azure-local.svg'
        );
      } else if (action === 'failover' && !site1Offline) {
        if (!hvReplicationOn) {
          hvReplicationOn = true;
          renderHvSite2StandbyState();
        }
        triggerHvReplicaFailoverToggle();
      } else if (action === 'failback' && site1Offline) {
        triggerHvReplicaFailoverToggle();
      }
    });
  });

  // Rack-Aware Cluster step handlers
  scenarioQuickStrip.querySelectorAll('[data-ra-count]').forEach(chip => {
    chip.addEventListener('click', () => {
      site1Offline = false;
      datacenterBox.classList.remove('site-outage');
      evacuatedRecords = [];
      rackNodesPerZone = Number(chip.getAttribute('data-ra-count'));
      buildRackAwareClusters();
      renderScenarioControlBar();
      setTimeout(resizeCanvas, 150);
    });
  });

  scenarioQuickStrip.querySelectorAll('[data-c1-ra]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-ra');
      if ((action === 'fail' && !site1Offline) || (action === 'recover' && site1Offline)) {
        triggerRackAwareZoneFailoverToggle();
      }
    });
  });

  // Update Manager step handlers
  scenarioQuickStrip.querySelectorAll('[data-c1-aum]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-c1-aum');
      if (action === 'play') {
        runFullRollingClusterUpdate();
      } else if (action === 'single') {
        patchSingleClusterNode(aumCurrentNodeIdx);
      } else if (action === 'reset') {
        initUpdateManagerScenario();
        renderScenarioControlBar();
      }
    });
  });

  // Unified Azure Policy step handlers
  scenarioQuickStrip.querySelectorAll('[data-c1-pol]').forEach(btn => {
    btn.addEventListener('click', () => {
      stopDemoAutoPlay();
      const action = btn.getAttribute('data-c1-pol');
      if (action === 'audit') {
        runPolicyAuditScan();
      } else if (action === 'fix') {
        if (policyStep === 'idle') runPolicyAuditScan();
        runPolicyAutoRemediation();
      } else if (action === 'test') {
        if (policyStep === 'idle') {
          runPolicyAuditScan();
          runPolicyAutoRemediation();
        } else if (policyStep === 'audited') {
          runPolicyAutoRemediation();
        }
        simulatePolicyBlockedDeploy();
      } else if (action === 'reset') {
        initPolicyScenario();
        renderScenarioControlBar();
      }
    });
  });

  // =========================================================================
  // OPTION 5: TOP-RIGHT HEADER SCENARIOS DROPDOWN + SKYWAY GAP STEP BAR
  // =========================================================================
  const headerScenariosPicker = document.getElementById('headerScenariosPicker');
  const skywayScenarioStepBar = document.getElementById('skywayScenarioStepBar');

  const SHORT_SCENARIO_LABELS = {
    'default': 'Overview',
    'wan-outage': 'Internet Outage',
    'node-failure': 'Node Failure (HA)',
    'asr': 'Cloud DR (ASR)',
    'hvreplica': '2nd Site DR',
    'rack-aware': 'Rack-Aware',
    'update-manager': 'Updates',
    'policy': 'Azure Policy'
  };

  if (headerScenariosPicker) {
    const popoverHtml = c1DrawerOpen ? `
      <div class="scn-popover-menu">
        ${SCENARIO_CATALOG.map(s => `
          <button type="button" class="pop-scn-item ${s.id === scenario ? 'active' : ''}" data-opt5-scn="${s.id}">
            ${s.iconHtml}
            <div>
              <strong>${s.shortLabel}</strong>
              <small>${s.bentoSub}</small>
            </div>
          </button>
        `).join('')}
      </div>
    ` : '';

    headerScenariosPicker.innerHTML = `
      <button type="button" class="opt5-header-btn" id="opt5HeaderTriggerBtn">
        ${currentMeta.iconHtml}
        <span>Scenarios: ${SHORT_SCENARIO_LABELS[scenario] || currentMeta.shortLabel}</span>
        <span>${c1DrawerOpen ? '▴' : '▾'}</span>
      </button>
      ${popoverHtml}
    `;

    document.getElementById('opt5HeaderTriggerBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      c1DrawerOpen = !c1DrawerOpen;
      renderScenarioControlBar();
    });

    headerScenariosPicker.querySelectorAll('[data-opt5-scn]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        c1DrawerOpen = false;
        selectScenario(btn.getAttribute('data-opt5-scn'));
      });
    });
  }

  if (skywayScenarioStepBar) {
    if (scenario === 'default') {
      skywayScenarioStepBar.hidden = true;
      skywayScenarioStepBar.innerHTML = '';
    } else {
      skywayScenarioStepBar.hidden = false;
      const stepBoxes = Array.from(scenarioQuickStrip.querySelectorAll('.c1-step-box'));
      const nextBtnOrig = scenarioQuickStrip.querySelector('[data-c1-next-action]');
      const playAllOrig = scenarioQuickStrip.querySelector('[data-c1-play-all]');

      const stepsHtml = stepBoxes.map((b, i) => {
        const state = b.classList.contains('done') ? 'done' : (b.classList.contains('active') ? 'active' : '');
        const lbl = b.querySelector('.c1-step-label')?.textContent || '';
        const num = b.querySelector('.c1-step-num')?.textContent || (i + 1);
        return `
          <button type="button" class="m-step-pill ${state}" data-opt5-step="${i}" ${aumBusy ? 'disabled' : ''}>
            <span class="m-step-num">${num}</span>
            <span>${lbl}</span>
          </button>
        `;
      }).join('');

      skywayScenarioStepBar.innerHTML = `
        <strong style="font-size:0.75rem; color:#0284c7;">${currentMeta.shortLabel}:</strong>
        ${extraChipsHtml}
        ${stepsHtml}
        ${nextBtnOrig ? `<button type="button" class="m-next-btn" id="opt5NextProxy" ${aumBusy ? 'disabled' : ''}>${nextBtnOrig.textContent.trim()}</button>` : ''}
        ${playAllOrig ? `<button type="button" class="m-playall-btn" id="opt5PlayAllProxy" ${aumBusy ? 'disabled' : ''}>${playAllOrig.textContent.trim()}</button>` : ''}
        <button type="button" class="m-clear-btn" id="opt5ClearProxy">✕ Clear</button>
      `;

      document.getElementById('opt5NextProxy')?.addEventListener('click', () => {
        nextBtnOrig.click();
      });
      document.getElementById('opt5PlayAllProxy')?.addEventListener('click', () => {
        playAllOrig.click();
      });
      document.getElementById('opt5ClearProxy')?.addEventListener('click', () => {
        selectScenario('default');
      });
      skywayScenarioStepBar.querySelectorAll('[data-opt5-step]').forEach(el => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-opt5-step'));
          stepBoxes[idx]?.click();
        });
      });

      // Wire Site B node count & Rack-Aware zone chips inside the Skyway bar
      skywayScenarioStepBar.querySelectorAll('[data-s2-count]').forEach(chip => {
        chip.addEventListener('click', () => {
          if (site1Offline) {
            showToast('Failback First', 'Fail back VMs to Site 1 before resizing Site B hardware.', 'icons/azure-local.svg');
            return;
          }
          hvSite2Nodes = Number(chip.getAttribute('data-s2-count'));
          buildHvReplicaSite2Cluster();
          renderScenarioControlBar();
          setTimeout(resizeCanvas, 150);
        });
      });
      skywayScenarioStepBar.querySelectorAll('[data-ra-count]').forEach(chip => {
        chip.addEventListener('click', () => {
          site1Offline = false;
          datacenterBox.classList.remove('site-outage');
          evacuatedRecords = [];
          rackNodesPerZone = Number(chip.getAttribute('data-ra-count'));
          buildRackAwareClusters();
          renderScenarioControlBar();
          setTimeout(resizeCanvas, 150);
        });
      });
    }
  }
}

document.addEventListener('click', () => {
  if (c1DrawerOpen) {
    c1DrawerOpen = false;
    renderScenarioControlBar();
  }
});

// ============================================================================
// SCENARIO SIMULATION HANDLERS
// ============================================================================

// 1. Single Node Failure & Automatic HA Restart (Site 1)
function toggleSingleNodeFailure(col) {
  const isOffline = col.classList.contains('offline');
  const pwrText = col.querySelector('.pwr-text');
  const box = col.querySelector('.node-workloads');
  const nodeLabel = col.querySelector('.node-id-label').textContent;

  if (!isOffline) {
    const onlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
    if (onlineCols.length <= 2) {
      showToast(
        'Cluster Quorum Protection',
        'At least 2 of 4 servers remain online to maintain shared storage quorum.',
        'icons/azure-local.svg'
      );
      return;
    }

    col.classList.add('offline');
    pwrText.textContent = 'FAILED';

    const pills = Array.from(box.children);
    pills.forEach((pill, idx) => {
      setTimeout(() => {
        const survivors = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
        survivors.sort((a, b) => a.querySelector('.node-workloads').children.length - b.querySelector('.node-workloads').children.length);
        if (survivors[0]) {
          flyWorkloadPill(pill, survivors[0].querySelector('.node-workloads'), true);
          updateContainerLoads(primaryNodesRow);
        }
      }, idx * 200);
    });

    updateContainerLoads(primaryNodesRow);
    renderScenarioControlBar();
    showToast(
      `${nodeLabel} Crashed — Automatic HA Restart!`,
      `Shared NVMe storage preserved every disk, and ${nodeLabel}'s VMs & AKS nodes automatically restarted onto healthy servers.`,
      'icons/vm.svg'
    );
  } else {
    col.classList.remove('offline');
    pwrText.textContent = 'ONLINE';

    const donors = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'))
      .filter(c => c !== col && c.querySelector('.node-workloads').children.length >= 3)
      .sort((a, b) => b.querySelector('.node-workloads').children.length - a.querySelector('.node-workloads').children.length);

    donors.slice(0, 2).forEach((donor, idx) => {
      const pill = donor.querySelector('.node-workloads').lastElementChild;
      if (pill) {
        setTimeout(() => {
          flyWorkloadPill(pill, box, false);
          updateContainerLoads(primaryNodesRow);
        }, idx * 160);
      }
    });

    updateContainerLoads(primaryNodesRow);
    renderScenarioControlBar();
  }
}

function setPrimarySiteDownVisual(isDown, statusWord = 'SITE DOWN') {
  datacenterBox.classList.toggle('site-outage', isDown);
  Array.from(primaryNodesRow.querySelectorAll('.node-column')).forEach(col => {
    col.classList.toggle('offline', isDown);
    col.querySelector('.pwr-text').textContent = isDown ? statusWord : 'ONLINE';
  });
  updateContainerLoads(primaryNodesRow);
}

// 2. Azure Site Recovery (Site 1 -> Azure Cloud)
function triggerAsrFailoverToggle() {
  if (!site1Offline) {
    site1Offline = true;
    evacuatedRecords = [];
    Array.from(primaryNodesRow.querySelectorAll('.vm-pill[data-replicable="true"]')).forEach(pill => {
      evacuatedRecords.push({ pill, homeBox: pill.parentElement });
    });

    setPrimarySiteDownVisual(true, 'SITE OFFLINE');
    asrStandbyHint.style.display = 'none';
    asrStatusSub.textContent = '● FAILOVER ACTIVE — Replicated VMs are now running live inside Microsoft Azure!';

    evacuatedRecords.forEach((rec, idx) => {
      setTimeout(() => flyWorkloadPill(rec.pill, asrCloudVmSlot, true), idx * 170);
    });

    renderScenarioControlBar();
    showToast(
      'Failed Over to Microsoft Azure!',
      'Site 1 went offline, so Azure Site Recovery booted your replicated VMs directly inside Azure Cloud.',
      'icons/asr.svg'
    );
  } else {
    site1Offline = false;
    setPrimarySiteDownVisual(false);
    evacuatedRecords.forEach((rec, idx) => {
      setTimeout(() => {
        flyWorkloadPill(rec.pill, rec.homeBox, true);
        updateContainerLoads(primaryNodesRow);
      }, idx * 150);
    });
    evacuatedRecords = [];
    asrStandbyHint.style.display = '';
    asrStatusSub.textContent = 'Continuous VM replication active (30s RPO) · Standing by in Azure';
    renderScenarioControlBar();
    showToast(
      'Failback to Site 1 Complete',
      'Delta changes reverse-replicated from Azure and VMs returned cleanly to Site 1.',
      'icons/azure-local.svg'
    );
  }
}

// 3. Hyper-V Replica Failover (Site 1 -> Customizable Site B)
function triggerHvReplicaFailoverToggle() {
  if (!site1Offline) {
    if (!hvReplicationOn) {
      hvReplicationOn = true;
    }
    site1Offline = true;
    evacuatedRecords = [];
    Array.from(primaryNodesRow.querySelectorAll('.vm-pill[data-replicable="true"]')).forEach(pill => {
      evacuatedRecords.push({ pill, homeBox: pill.parentElement });
    });

    setPrimarySiteDownVisual(true, 'SITE OFFLINE');

    const site2Cols = Array.from(secondaryNodesRow.children);
    site2Cols.forEach(c => {
      c.querySelector('.node-workloads').innerHTML = '';
      c.querySelector('.pwr-text').textContent = 'LIVE · DR';
    });

    evacuatedRecords.forEach((rec, idx) => {
      const targetBox = site2Cols[idx % site2Cols.length].querySelector('.node-workloads');
      setTimeout(() => {
        flyWorkloadPill(rec.pill, targetBox, true);
        updateContainerLoads(secondaryNodesRow);
      }, idx * 170);
    });

    secondaryClusterSub.textContent = '● FAILOVER ACTIVE — Site 1 VMs are now running live on Site B!';
    renderScenarioControlBar();
    showToast(
      'Failed Over to Site B (Hyper-V Replica)!',
      `Site 1 went offline — your replicated VMs booted across Site B's ${hvSite2Nodes}-node Azure Local cluster.`,
      'icons/azure-local.svg'
    );
  } else {
    site1Offline = false;
    setPrimarySiteDownVisual(false);

    evacuatedRecords.forEach((rec, idx) => {
      setTimeout(() => {
        flyWorkloadPill(rec.pill, rec.homeBox, true);
        updateContainerLoads(primaryNodesRow);
        if (idx === evacuatedRecords.length - 1) {
          setTimeout(renderHvSite2StandbyState, 350);
        }
      }, idx * 150);
    });
    evacuatedRecords = [];
    renderScenarioControlBar();
    showToast(
      'Planned Failback to Site 1 Complete',
      'Site 1 is online again — VMs failed back and resumed Hyper-V Replica protection to Site B.',
      'icons/azure-local.svg'
    );
  }
}

// 4. Rack-Aware Cluster Zone 1 Offline -> Automatic Zero-RPO HA Restart in Zone 2!
function triggerRackAwareZoneFailoverToggle() {
  if (!site1Offline) {
    site1Offline = true;
    evacuatedRecords = [];
    // In a Rack-Aware stretched cluster with synchronous S2D storage, ALL VMs & AKS nodes in Zone 1 auto-restart in Zone 2!
    Array.from(primaryNodesRow.querySelectorAll('.vm-pill')).forEach(pill => {
      evacuatedRecords.push({ pill, homeBox: pill.parentElement });
    });

    setPrimarySiteDownVisual(true, 'ZONE DOWN');
    primaryClusterBadge.textContent = '⚠ Zone 1 Offline · Workloads Moved to Zone 2';

    const z2Cols = Array.from(secondaryNodesRow.children);
    evacuatedRecords.forEach((rec, idx) => {
      const targetBox = z2Cols[idx % z2Cols.length].querySelector('.node-workloads');
      setTimeout(() => {
        flyWorkloadPill(rec.pill, targetBox, true);
        updateContainerLoads(secondaryNodesRow);
      }, idx * 170);
    });

    secondaryClusterSub.textContent = '● Hosting all cluster workloads via synchronous shared storage (0 data loss)';
    renderScenarioControlBar();
    const isSanRa = site1StorageMode === 'san';
    showToast(
      'Zone 1 Offline — Automatic Stretched Cluster Failover!',
      isSanRa
        ? 'Because Site 1 & Site 2 share synchronous SAN storage (< 5 ms latency), all Zone 1 VMs & AKS nodes automatically restarted in Zone 2 with zero data loss!'
        : 'Because Site 1 & Site 2 share one synchronous Storage Spaces Direct pool (< 1 ms RDMA), all Zone 1 VMs & AKS nodes automatically restarted in Zone 2 with zero data loss!',
      isSanRa ? 'icons/storage.svg' : 'icons/azure-local.svg'
    );
  } else {
    site1Offline = false;
    setPrimarySiteDownVisual(false);
    primaryClusterBadge.textContent = '● High-Availability Cluster Active';
    secondaryClusterSub.textContent = 'Local Availability Zone 2';

    evacuatedRecords.forEach((rec, idx) => {
      setTimeout(() => {
        flyWorkloadPill(rec.pill, rec.homeBox, false);
        updateContainerLoads(primaryNodesRow);
        updateContainerLoads(secondaryNodesRow);
      }, idx * 140);
    });
    evacuatedRecords = [];
    renderScenarioControlBar();
    showToast(
      'Zone 1 Recovered & Rebalanced',
      'Site 1 (Availability Zone 1) rejoined the stretched cluster and rebalanced active workloads.',
      'icons/azure-local.svg'
    );
  }
}

// 5. Azure Update Manager — Zero-Downtime Cluster-Aware Updating (Connected Mode)
function initUpdateManagerScenario() {
  aumAutoTimers.forEach(t => clearTimeout(t));
  aumAutoTimers = [];
  aumCurrentNodeIdx = 0;
  aumBusy = false;
  aumUpdateDownloaded = false;
  buildStandardPrimaryCluster();
  applyClusterStorageMode(1, site1StorageMode, false);
  primaryClusterBadge.textContent = '● Update Available: AzLoc v2610 (OS + Agents + OEM Firmware)';
}

function downloadClusterUpdateOnce(onPackageReady) {
  if (aumUpdateDownloaded) {
    onPackageReady();
    return;
  }

  const cpOrigin = getCloudConduitOrigin();
  const arcBridgePt = relCenter(arcBridgeBadge);
  const midY = (cpOrigin.y + arcBridgePt.y) / 2;

  primaryClusterBadge.textContent = '☁️ Downloading AzLoc v2610 + OEM SBE Update Package from Azure via Azure Arc...';
  Array.from(primaryNodesRow.querySelectorAll('.node-version-badge')).forEach(badge => {
    badge.textContent = '⬇ Receiving Cluster Update via Azure Arc...';
  });

  // Single update package travels slowly down the existing Azure -> Azure Arc curved control plane link once for the whole cluster
  commandBursts.push({
    curve: true,
    p0: { x: cpOrigin.x, y: cpOrigin.y },
    p1: { x: cpOrigin.x, y: midY },
    p2: { x: arcBridgePt.x, y: midY },
    p3: { x: arcBridgePt.x, y: arcBridgePt.y },
    t: 0,
    speed: 0.0036,
    color: '#f59e0b',
    label: '⬇ AzLoc v2610 + OEM SBE Update',
    onArrive: () => {
      aumUpdateDownloaded = true;
      Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.patched-node) .node-version-badge')).forEach(badge => {
        badge.textContent = '📦 v2610 Staged Locally · Waiting for CAU Turn';
      });
      onPackageReady();
    }
  });
}

function patchSingleClusterNode(nodeIdx, onDoneCallback) {
  if (aumBusy) return;
  const cols = Array.from(primaryNodesRow.querySelectorAll('.node-column'));
  const col = cols[nodeIdx];
  if (!col || col.classList.contains('patched-node')) {
    if (onDoneCallback) onDoneCallback();
    return;
  }

  aumBusy = true;
  aumCurrentNodeIdx = nodeIdx;
  renderScenarioControlBar();

  const nodeLabel = `Node ${nodeIdx + 1}`;
  const pwrText = col.querySelector('.pwr-text');
  const verBadge = col.querySelector('.node-version-badge');
  const box = col.querySelector('.node-workloads');

  // Download the update package once from Azure via the existing link; subsequent nodes patch directly from the staged package!
  downloadClusterUpdateOnce(() => {
    // Phase 1: Enter Maintenance Mode (DRAINING) & slowly Live-Migrate VMs off
    col.classList.add('updating-node');
    pwrText.textContent = 'DRAINING VMs';
    if (verBadge) verBadge.textContent = 'Maintenance Mode · Live Migrating VMs (0 Downtime)...';
    primaryClusterBadge.textContent = `🔄 CAU Draining ${nodeLabel}: Live-migrating VMs to peer nodes (0 Downtime)...`;

    const pillsToReturn = [];
    const pills = Array.from(box.children);
    const peers = cols.filter((_, idx) => idx !== nodeIdx);

    pills.forEach((pill, i) => {
      const peerCol = peers[(nodeIdx + i) % peers.length];
      const targetBox = peerCol.querySelector('.node-workloads');
      pillsToReturn.push({ pill, homeBox: box });
      const tMig = setTimeout(() => {
        flyWorkloadPill(pill, targetBox, false, 2100);
        updateContainerLoads(primaryNodesRow);
      }, 350 + i * 750);
      aumAutoTimers.push(tMig);
    });

    // Phase 2: Apply OS + Solution Builder Extension (SBE) firmware/drivers & reboot (slower so viewer can read)
    const tPatch = setTimeout(() => {
      pwrText.textContent = 'PATCHING OS & SBE';
      if (verBadge) verBadge.textContent = '⚙️ Installing AzLoc v2610 OS + OEM SBE Firmware...';
      primaryClusterBadge.textContent = `⚙️ ${nodeLabel}: Installing AzLoc v2610 OS, Arc Agents & OEM SBE Firmware...`;
    }, 3100);
    aumAutoTimers.push(tPatch);

    const tReboot = setTimeout(() => {
      pwrText.textContent = 'REBOOTING NODE';
      if (verBadge) verBadge.textContent = '🔄 Applying BIOS/Firmware & Warm Rebooting...';
      primaryClusterBadge.textContent = `🔄 ${nodeLabel}: Rebooting server with updated v2610 stack (VMs still running on peers)...`;
    }, 5600);
    aumAutoTimers.push(tReboot);

    // Phase 3: Node comes back online at v2610 and smoothly Live-Migrates VMs back home
    const tFinish = setTimeout(() => {
      col.classList.remove('updating-node');
      col.classList.add('patched-node');
      pwrText.textContent = 'ONLINE · v2610';
      if (verBadge) verBadge.textContent = '✓ AzLoc v2610 · OS & OEM SBE Current';
      primaryClusterBadge.textContent = `↩️ ${nodeLabel} Online (v2610) — Live-migrating VMs back home...`;

      pillsToReturn.forEach((rec, idx) => {
        const tBack = setTimeout(() => {
          flyWorkloadPill(rec.pill, rec.homeBox, false, 2000);
          updateContainerLoads(primaryNodesRow);
        }, idx * 600);
        aumAutoTimers.push(tBack);
      });

      const tSettle = setTimeout(() => {
        aumCurrentNodeIdx = Math.min(nodeIdx + 1, 4);
        aumBusy = false;

        const patchedCount = primaryNodesRow.querySelectorAll('.node-column.patched-node').length;
        if (patchedCount >= 4) {
          primaryClusterBadge.textContent = '✓ All 4 Nodes Updated to AzLoc v2610 — Zero VM Downtime!';
          showToast(
            'Rolling Cluster Update Complete (v2610)!',
            'One update package came down from Azure and Cluster-Aware Updating patched all 4 nodes (OS + OEM SBE firmware) with zero workload downtime.',
            'icons/updates.svg'
          );
        } else {
          primaryClusterBadge.textContent = `✓ ${nodeLabel} Updated to v2610 (${patchedCount}/4 Complete)`;
        }

        renderScenarioControlBar();
        if (onDoneCallback) onDoneCallback();
      }, 2100);
      aumAutoTimers.push(tSettle);
    }, 7800);
    aumAutoTimers.push(tFinish);
  });
}

function runFullRollingClusterUpdate() {
  if (aumBusy) return;
  showToast(
    'Azure Update Manager — Rolling Update Started',
    'One AzLoc v2610 + OEM SBE update package downloads along the Azure Arc link, then Cluster-Aware Updating patches Nodes 1→4 sequentially.',
    'icons/updates.svg'
  );

  function stepNext() {
    const cols = Array.from(primaryNodesRow.querySelectorAll('.node-column'));
    const nextIdx = cols.findIndex(c => !c.classList.contains('patched-node'));
    if (nextIdx === -1) return;
    patchSingleClusterNode(nextIdx, () => {
      const tNext = setTimeout(stepNext, 900);
      aumAutoTimers.push(tNext);
    });
  }
  stepNext();
}

// 6. Unified Azure Policy — Simple 1-Button Story (Audit -> Enforce & Fix -> Test New VM)
function setWorkloadPolicyChip(pill, state, text) {
  if (!pill) return;
  let chip = pill.querySelector('.pol-chip');
  if (!text) {
    if (chip) chip.remove();
    pill.classList.remove('policy-noncompliant');
    return;
  }
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'pol-chip';
    pill.appendChild(chip);
  }
  chip.className = `pol-chip ${state}`;
  chip.textContent = text;
  pill.classList.toggle('policy-noncompliant', state === 'noncompliant');
}

function initPolicyScenario() {
  policyStep = 'idle';
  buildStandardPrimaryCluster();
  applyClusterStorageMode(1, site1StorageMode, false);

  // Clear all chips so the view starts clean & uncluttered
  document.querySelectorAll('#policyCloudResourcesRow .vm-pill').forEach(pill => {
    setWorkloadPolicyChip(pill, '', '');
  });

  const scoreBadge = document.getElementById('policyComplianceBadge');
  if (scoreBadge) {
    scoreBadge.className = 'policy-compliance-score';
    scoreBadge.textContent = '3 Cloud VMs · Ready to Audit OS Baseline';
  }
  primaryClusterBadge.textContent = '🛡️ Machine Configuration Assigned: "Guest OS Security Baseline (TLS 1.2 & Firewall)"';
}

function advancePolicySingleButton() {
  if (policyStep === 'idle') {
    runPolicyAuditScan();
  } else if (policyStep === 'audited') {
    runPolicyAutoRemediation();
  } else if (policyStep === 'remediated') {
    simulatePolicyBlockedDeploy();
  } else {
    initPolicyScenario();
    renderScenarioControlBar();
  }
}

function runPolicyAuditScan() {
  policyStep = 'audited';

  // Remove any leftover test VM
  primaryNodesRow.querySelectorAll('.vm-pill.policy-test-vm').forEach(el => el.remove());

  // Flag 1 Public Cloud VM (Cloud-SQL-VM-01) and 2 On-Premises VMs as Guest OS Baseline Drift
  const cloudSqlCard = document.querySelector('[data-policy-target="cloud-sql-1"]');
  const cloudWebCard = document.querySelector('[data-policy-target="cloud-vm-1"]');
  const cloudAksCard = document.querySelector('[data-policy-target="cloud-aks-1"]');
  if (cloudWebCard) setWorkloadPolicyChip(cloudWebCard, 'compliant', '✓ OS Hardened');
  if (cloudSqlCard) setWorkloadPolicyChip(cloudSqlCard, 'noncompliant', '⚠ TLS 1.0 Enabled');
  if (cloudAksCard) setWorkloadPolicyChip(cloudAksCard, 'compliant', '✓ OS Hardened');

  const pills = Array.from(primaryNodesRow.querySelectorAll('.vm-pill'));
  pills.forEach(pill => {
    const nameEl = pill.querySelector('.pill-name');
    const name = (pill.dataset.vmName || (nameEl ? nameEl.textContent : '')).trim();
    if (name.includes('SQL-Srv-01')) {
      setWorkloadPolicyChip(pill, 'noncompliant', '⚠ Firewall Off');
    } else if (name.includes('Web-VM-02')) {
      setWorkloadPolicyChip(pill, 'noncompliant', '⚠ TLS 1.0 Enabled');
    } else {
      // Keep compliant local VMs clean (no noisy badge) so only the drifted VMs stand out!
      setWorkloadPolicyChip(pill, '', '');
    }
  });

  const scoreBadge = document.getElementById('policyComplianceBadge');
  if (scoreBadge) {
    scoreBadge.className = 'policy-compliance-score';
    scoreBadge.textContent = '⚠ In-Guest Drift Detected: 1 Cloud VM · 2 On-Prem VMs';
  }
  primaryClusterBadge.textContent = '⚠ Machine Config Audit: 2 Local VMs have OS Baseline Drift (Firewall / TLS)';

  renderScenarioControlBar();
  showToast(
    'Step 1: Guest OS Security Drift Detected',
    'Azure Machine Configuration audited inside every VM across Azure and On-Premises—finding legacy TLS 1.0 and disabled Host Firewalls on 3 VMs.',
    'icons/policy.svg'
  );
}

function runPolicyAutoRemediation() {
  policyStep = 'remediated';
  renderScenarioControlBar();

  const policyOrb = (mode === 'disconnected'
    ? document.getElementById('mgmtPolicyOrb')
    : document.getElementById('cpPolicyOrb')) || cloudBox;
  const from = relCenter(policyOrb);

  // Send remediation pulse to the 1 Cloud VM + 2 On-Premises VMs
  const cloudSqlCard = document.querySelector('[data-policy-target="cloud-sql-1"]');
  if (cloudSqlCard) {
    setWorkloadPolicyChip(cloudSqlCard, 'remediating', '⚙ Hardening OS...');
    if (mode === 'connected') {
      const toCloud = relCenter(cloudSqlCard);
      commandBursts.push({ sx: from.x, sy: from.y, tx: toCloud.x, ty: toCloud.y, t: 0, color: '#38bdf8' });
    }
  }

  const flaggedLocalPills = [];
  Array.from(primaryNodesRow.querySelectorAll('.vm-pill')).forEach(pill => {
    const chip = pill.querySelector('.pol-chip');
    if (chip && chip.classList.contains('noncompliant')) {
      flaggedLocalPills.push(pill);
      setWorkloadPolicyChip(pill, 'remediating', '⚙ Hardening OS...');
      const toLocal = relCenter(pill);
      commandBursts.push({ sx: from.x, sy: from.y, tx: toLocal.x, ty: toLocal.y, t: 0, color: '#10b981' });
    }
  });

  setTimeout(() => {
    if (cloudSqlCard) setWorkloadPolicyChip(cloudSqlCard, 'compliant', '✓ OS Hardened');
    flaggedLocalPills.forEach(pill => setWorkloadPolicyChip(pill, 'compliant', '✓ OS Hardened'));

    const scoreBadge = document.getElementById('policyComplianceBadge');
    if (scoreBadge) {
      scoreBadge.className = 'policy-compliance-score all-compliant';
      scoreBadge.textContent = '✓ 100% Guest OS Baseline Compliant (Cloud + On-Prem)';
    }
    primaryClusterBadge.textContent = '✓ Guest OS Remediated: TLS 1.2 & Host Firewall Enforced Inside All VMs';
    renderScenarioControlBar();

    showToast(
      'Step 2: In-Guest OS Drift Auto-Remediated!',
      'Azure Machine Configuration via the Arc Connected Machine agent automatically enforced TLS 1.2 and enabled the Host Firewall inside all drifted VMs.',
      'icons/policy.svg'
    );
  }, 1150);
}

function simulatePolicyBlockedDeploy() {
  policyStep = 'tested';
  renderScenarioControlBar();

  const cols = Array.from(primaryNodesRow.querySelectorAll('.node-column'));
  if (!cols.length) return;
  const targetBox = cols[0].querySelector('.node-workloads');

  // Remove any previous test VM pill first
  primaryNodesRow.querySelectorAll('.vm-pill.policy-test-vm').forEach(el => el.remove());

  const policyOrb = (mode === 'disconnected'
    ? document.getElementById('mgmtPolicyOrb')
    : document.getElementById('cpPolicyOrb')) || cloudBox;
  const from = relCenter(policyOrb);
  const to = relCenter(targetBox);

  // Step 3a: New VM is created on Node 1 first (unhardened default OS image)
  const newVmPill = document.createElement('div');
  newVmPill.className = 'vm-pill policy-test-vm';
  newVmPill.innerHTML = `
    <span class="run-dot"></span>
    <img src="icons/vm.svg" alt="" />
    <span class="pill-name">New-App-VM</span>
    <span class="pol-chip remediating">⚙ Applying Baseline...</span>
  `;
  targetBox.insertBefore(newVmPill, targetBox.firstChild);
  updateContainerLoads(primaryNodesRow);
  primaryClusterBadge.textContent = '⚙ "New-App-VM" Deployed — DeployIfNotExists Applying OS Security Baseline...';

  // Step 3b: Azure Policy (DeployIfNotExists) sends Machine Configuration baseline down to harden it post-creation
  commandBursts.push({
    sx: from.x,
    sy: from.y,
    tx: to.x,
    ty: to.y,
    t: 0,
    color: '#10b981',
    onArrive: () => {
      setWorkloadPolicyChip(newVmPill, 'compliant', '✓ OS Hardened');
      primaryClusterBadge.textContent = '✓ "New-App-VM" Deployed & Automatically Hardened by Guest OS Policy!';

      showToast(
        'Step 3: New VM Deployed & Auto-Hardened (DeployIfNotExists)',
        '"New-App-VM" was created on Node 1, and Azure Policy Machine Configuration automatically applied the TLS 1.2 & Firewall baseline inside the OS.',
        'icons/policy.svg'
      );
    }
  });
}

// ============================================================================
// "+ CREATE LOCAL VM" BUTTON
// ============================================================================
function triggerDeployLocalVm(e) {
  if (e) e.stopPropagation();
  if (mode === 'connected' && cableCut) {
    showToast(
      'Internet Paused',
      'Existing VMs stay running up to 30 days! Restore internet or switch to Disconnected Mode to deploy new VMs.',
      'icons/azure-arc.svg'
    );
    return;
  }

  // Pick least-loaded online node across active cluster(s)
  let candidateCols = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
  if (scenario === 'rack-aware' || (scenario === 'hvreplica' && site1Offline)) {
    candidateCols = candidateCols.concat(Array.from(secondaryNodesRow.querySelectorAll('.node-column:not(.offline)')));
  }
  if (!candidateCols.length) return;

  candidateCols.sort((a, b) => a.querySelectorAll('.vm-pill').length - b.querySelectorAll('.vm-pill').length);
  const targetBox = candidateCols[0].querySelector('.node-workloads');

  const from = (mode === 'disconnected' && mgmtClusterBox && mgmtClusterBox.getBoundingClientRect().height > 60)
    ? getMgmtConduitOrigin()
    : getCloudConduitOrigin();
  const to = relCenter(targetBox);
  const burstColor = mode === 'connected' ? '#38bdf8' : '#fbbf24';

  commandBursts.push({
    sx: from.x,
    sy: from.y,
    tx: to.x,
    ty: to.y,
    t: 0,
    color: burstColor,
    onArrive: () => {
      vmCount += 1;
      const pill = createVmPillElement({
        name: `App-VM-0${vmCount}`,
        icon: 'icons/vm.svg',
        cls: '',
        replicable: true
      });
      pill.style.animation = 'spawnPop 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
      targetBox.appendChild(pill);
      updateContainerLoads(primaryNodesRow);
      updateContainerLoads(secondaryNodesRow);
      if (scenario === 'hvreplica' && hvReplicationOn && !site1Offline) {
        renderHvSite2StandbyState();
      }
    }
  });
}

btnAddVm.addEventListener('click', triggerDeployLocalVm);
const btnAddVmRack = document.getElementById('btnAddVmRack');
if (btnAddVmRack) {
  btnAddVmRack.addEventListener('click', triggerDeployLocalVm);
}

// ============================================================================
// 60FPS ANIMATED PARTICLE STREAMS + MULTI-SCENARIO BEAMS
// ============================================================================
const particles = [];
const commandBursts = [];

function resizeCanvas() {
  const rect = visualStage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);

function relCenter(el) {
  const stageRect = visualStage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: r.left - stageRect.left + r.width / 2,
    y: r.top - stageRect.top + r.height / 2
  };
}

function isTwoSiteScenario() {
  return (scenario === 'hvreplica' || scenario === 'rack-aware') &&
    secondarySiteBox.getBoundingClientRect().width > 80;
}

function cubicBezierPt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

function getCloudConduitOrigin() {
  const stageRect = visualStage.getBoundingClientRect();
  const cRect = cloudBox.getBoundingClientRect();
  return {
    x: cRect.left - stageRect.left + cRect.width / 2,
    y: cRect.bottom - stageRect.top - 4
  };
}

function spawnCloudArcStreamParticle(targetBadgeEl, isLight) {
  const cp = getCloudConduitOrigin();
  const arc = relCenter(targetBadgeEl);
  const cpAnchor = { x: cp.x + (Math.random() - 0.5) * 44, y: cp.y };
  const arcAnchor = { x: arc.x + (Math.random() - 0.5) * 28, y: arc.y };
  const upward = Math.random() > 0.62;
  const p0 = upward ? arcAnchor : cpAnchor;
  const p3 = upward ? cpAnchor : arcAnchor;
  const midY = (p0.y + p3.y) / 2;

  particles.push({
    curve: true,
    p0,
    p1: { x: p0.x, y: midY },
    p2: { x: p3.x, y: midY },
    p3,
    t: 0,
    speed: 0.0032 + Math.random() * 0.0022,
    size: 2.1 + Math.random() * 1.1,
    color: upward ? (isLight ? '#059669' : '#34d399') : (isLight ? '#0284c7' : '#38bdf8')
  });
}

function getMgmtConduitOrigin() {
  const stageRect = visualStage.getBoundingClientRect();
  const mRect = mgmtClusterBox.getBoundingClientRect();
  return {
    x: mRect.right - stageRect.left - 4,
    y: mRect.top - stageRect.top + mRect.height * 0.42
  };
}

function spawnLocalMgmtArcParticle(targetBadgeEl, isLight) {
  const stageRect = visualStage.getBoundingClientRect();
  const mRect = mgmtClusterBox.getBoundingClientRect();
  const dRect = datacenterBox.getBoundingClientRect();
  if (mRect.width < 60 || dRect.width < 60) return;

  const yMid = (Math.max(mRect.top, dRect.top) + Math.min(mRect.bottom, dRect.bottom)) / 2 - stageRect.top;
  const yOff = (Math.random() - 0.5) * 140;
  const toWorkload = Math.random() > 0.35;
  const xLeft = mRect.right - stageRect.left - 2;
  const xRight = dRect.left - stageRect.left + 2;

  particles.push({
    sx: toWorkload ? xLeft : xRight,
    sy: yMid + yOff,
    tx: toWorkload ? xRight : xLeft,
    ty: yMid + yOff,
    t: 0,
    speed: 0.014 + Math.random() * 0.006,
    size: 2.3 + Math.random() * 1.0,
    color: toWorkload
      ? (isLight ? '#d97706' : '#fbbf24')
      : (isLight ? '#059669' : '#34d399')
  });
}

function spawnAmbientParticle() {
  const isLight = body.classList.contains('light-mode');

  // 1. Cloud <-> Arc stream (Connected Mode) OR Dedicated 3-Node Mgmt Cluster <-> On-Premises Arc stream (Disconnected Mode)
  if (mode === 'connected' && !cableCut) {
    if (!site1Offline || isTwoSiteScenario()) {
      spawnCloudArcStreamParticle(arcBridgeBadge, isLight);
    }
  } else if (mode === 'disconnected' && mgmtClusterBox) {
    if (mgmtClusterBox.getBoundingClientRect().height > 60) {
      if (!site1Offline || isTwoSiteScenario()) {
        spawnLocalMgmtArcParticle(arcBridgeBadge, isLight);
      }
      // Also animate OIDC / LDAPS identity sync pulses between Mgmt Cluster and Separate AD / AD FS box!
      if (localIdentityBox) {
        const stageRect = visualStage.getBoundingClientRect();
        const mRect = mgmtClusterBox.getBoundingClientRect();
        const idRect = localIdentityBox.getBoundingClientRect();
        if (idRect.width > 80 && idRect.left > mRect.right - 10) {
          const midY = (Math.max(mRect.top, idRect.top) + Math.min(mRect.bottom, idRect.bottom)) / 2 - stageRect.top;
          const yOff = (Math.random() - 0.5) * 90;
          const toIdentity = Math.random() > 0.5;
          particles.push({
            sx: toIdentity ? (mRect.right - stageRect.left - 4) : (idRect.left - stageRect.left + 4),
            sy: midY + yOff,
            tx: toIdentity ? (idRect.left - stageRect.left + 4) : (mRect.right - stageRect.left - 4),
            ty: midY + yOff,
            t: 0,
            speed: 0.008 + Math.random() * 0.004,
            size: 2.2 + Math.random() * 0.9,
            color: toIdentity ? (isLight ? '#7c3aed' : '#c084fc') : (isLight ? '#d97706' : '#fbbf24')
          });
        }
      }
    }
  }

  // 2. ASR Continuous Replication Stream (Dedicated upward VM block conduit: Site 1 -> Azure Recovery Vault)
  if (scenario === 'asr' && !site1Offline && !cableCut) {
    const asrBay = document.getElementById('asrCloudBay');
    if (asrBay) {
      const stageRect = visualStage.getBoundingClientRect();
      const dRect = sitesOuterFrame.getBoundingClientRect();
      const aRect = asrBay.getBoundingClientRect();
      // Anchor ASR conduit on the left-center of the skyway so it stays visually separate from the right-side Azure Arc Control Plane curve
      const laneX = dRect.left - stageRect.left + dRect.width * 0.34;
      const fromY = dRect.top - stageRect.top + 4;
      const toY = aRect.bottom - stageRect.top - 2;
      particles.push({
        shape: 'block',
        sx: laneX,
        sy: fromY,
        tx: laneX,
        ty: toY,
        t: 0,
        speed: 0.011 + Math.random() * 0.004,
        w: 4.5,
        h: 9,
        color: isLight ? '#7c3aed' : '#c084fc'
      });
    }
  }

  // 3. Hyper-V Replica Stream (One-way async VM block replication Site 1 -> Site B on a single dedicated lane)
  if (scenario === 'hvreplica' && hvReplicationOn && !site1Offline) {
    const stageRect = visualStage.getBoundingClientRect();
    const pRect = datacenterBox.getBoundingClientRect();
    const sRect = secondarySiteBox.getBoundingClientRect();
    if (sRect.width > 80 && sRect.left > pRect.left + 100) {
      const midY = (Math.max(pRect.top, sRect.top) + Math.min(pRect.bottom, sRect.bottom)) / 2 - stageRect.top;
      particles.push({
        shape: 'block',
        sx: pRect.right - stageRect.left - 4,
        sy: midY,
        tx: sRect.left - stageRect.left + 4,
        ty: midY,
        t: 0,
        speed: 0.012 + Math.random() * 0.004,
        w: 8,
        h: 4,
        color: isLight ? '#059669' : '#34d399'
      });
    }
  }

  // 4. Rack-Aware Bidirectional Synchronous Storage Replication (1 Lane There -> and 1 Lane Back <-)
  if (scenario === 'rack-aware' && !site1Offline) {
    const stageRect = visualStage.getBoundingClientRect();
    const pRect = datacenterBox.getBoundingClientRect();
    const sRect = secondarySiteBox.getBoundingClientRect();
    if (sRect.width > 80 && sRect.left > pRect.left + 100) {
      const midY = (Math.max(pRect.top, sRect.top) + Math.min(pRect.bottom, sRect.bottom)) / 2 - stageRect.top;
      const isSan = site1StorageMode === 'san';
      const leftToRight = Math.random() > 0.5;
      // Top lane (-14px): Zone 1 -> Zone 2; Bottom lane (+14px): Zone 2 -> Zone 1
      const laneY = leftToRight ? (midY - 14) : (midY + 14);
      const packetColor = isSan
        ? (leftToRight ? (isLight ? '#7c3aed' : '#c084fc') : (isLight ? '#9333ea' : '#e879f9'))
        : (leftToRight ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#059669' : '#34d399'));

      particles.push({
        shape: 'block',
        sx: leftToRight ? (pRect.right - stageRect.left - 4) : (sRect.left - stageRect.left + 4),
        sy: laneY,
        tx: leftToRight ? (sRect.left - stageRect.left + 4) : (pRect.right - stageRect.left - 4),
        ty: laneY,
        t: 0,
        speed: 0.016 + Math.random() * 0.005,
        w: 9,
        h: 4,
        color: packetColor
      });
    }
  }
}

function drawArrowhead(ctx, x, y, dir, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dir * 7, y - 4.5);
  ctx.lineTo(x - dir * 7, y + 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVerticalArrowhead(ctx, x, y, dirY, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 5.5, y - dirY * 8);
  ctx.lineTo(x + 5.5, y - dirY * 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawControlPlaneGuide(originPt, targetBadgeEl, isOffline = false, sovereignPalette = false) {
  const a = relCenter(targetBadgeEl);
  ctx.save();
  if (isOffline) {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.setLineDash([6, 6]);
  } else {
    const grad = ctx.createLinearGradient(originPt.x, originPt.y, a.x, a.y);
    if (sovereignPalette) {
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.36)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.32)');
    } else {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.24)');
    }
    ctx.strokeStyle = grad;
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originPt.x, originPt.y);
  ctx.bezierCurveTo(originPt.x, (originPt.y + a.y) / 2, a.x, (originPt.y + a.y) / 2, a.x, a.y);
  ctx.stroke();
  ctx.restore();
}

function animateCanvas() {
  const rect = visualStage.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (Math.random() < 0.12) spawnAmbientParticle();

  // Guide curves: Cloud -> On-Premises Arc (Connected) OR Local Mgmt Wing -> Workload Cluster (Disconnected)!
  if (mode === 'connected' && !cableCut) {
    const origin = getCloudConduitOrigin();
    drawControlPlaneGuide(origin, arcBridgeBadge, site1Offline && !isTwoSiteScenario(), false);
  } else if (mode === 'disconnected' && mgmtClusterBox && mgmtClusterBox.getBoundingClientRect().width > 60) {
    const stageRect = visualStage.getBoundingClientRect();
    const mRect = mgmtClusterBox.getBoundingClientRect();
    const dRect = datacenterBox.getBoundingClientRect();
    if (dRect.left > mRect.right) {
      const x1 = mRect.right - stageRect.left;
      const x2 = dRect.left - stageRect.left;
      const yMid = (Math.max(mRect.top, dRect.top) + Math.min(mRect.bottom, dRect.bottom)) / 2 - stageRect.top;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, yMid);
      ctx.lineTo(x2, yMid);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Dedicated ASR Upward VM Replication Conduit across the Skyway Gap (Site 1 -> Azure Recovery Vault)
  if (scenario === 'asr' && !cableCut) {
    const asrBay = document.getElementById('asrCloudBay');
    if (asrBay) {
      const stageRect = visualStage.getBoundingClientRect();
      const dRect = sitesOuterFrame.getBoundingClientRect();
      const aRect = asrBay.getBoundingClientRect();
      const laneX = dRect.left - stageRect.left + dRect.width * 0.34;
      const yBottom = dRect.top - stageRect.top + 4;
      const yTop = aRect.bottom - stageRect.top - 2;
      const midY = (yBottom + yTop) / 2;
      const isLight = body.classList.contains('light-mode');
      const lineColor = site1Offline
        ? 'rgba(244, 63, 94, 0.32)'
        : (isLight ? 'rgba(124, 58, 237, 0.45)' : 'rgba(192, 132, 252, 0.48)');

      // Subtle purple replication channel backing
      ctx.save();
      ctx.fillStyle = site1Offline ? 'rgba(244, 63, 94, 0.04)' : 'rgba(147, 51, 234, 0.05)';
      ctx.beginPath();
      ctx.roundRect(laneX - 6, yTop, 12, Math.max(12, yBottom - yTop), 6);
      ctx.fill();
      ctx.restore();

      // Upward Replication Line (Site 1 -> Azure)
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash(site1Offline ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(laneX, yBottom - 2);
      ctx.lineTo(laneX, yTop + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Upward Arrowhead at the top (entering Azure Recovery Vault) + Midpoint directional chevron
      drawVerticalArrowhead(ctx, laneX, yTop + 2, -1, lineColor);
      if (!site1Offline && yBottom - yTop > 55) {
        drawVerticalArrowhead(ctx, laneX, midY + 14, -1, lineColor);
      }

      // Pill Badge next to the upward conduit indicating replication direction to Azure
      ctx.save();
      const tagText = site1Offline ? 'FAILOVER ACTIVE IN AZURE' : '↑ VM REPLICATION TO AZURE (30s RPO)';
      ctx.font = '700 9.5px "Segoe UI", system-ui, sans-serif';
      const tw = ctx.measureText(tagText).width + 14;
      const pillX = laneX - tw - 14;
      ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(pillX, midY - 10, tw, 20, 999);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = site1Offline
        ? (isLight ? '#be123c' : '#fda4af')
        : (isLight ? '#6d28d9' : '#d8b4fe');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, pillX + tw / 2, midY);
      ctx.restore();
    }
  }

  // Dedicated VM & Storage Replication Conduit between Site 1 & Site 2 (Distinct from Control Plane skyway!)
  if (scenario === 'hvreplica' || scenario === 'rack-aware') {
    const stageRect = visualStage.getBoundingClientRect();
    const pRect = datacenterBox.getBoundingClientRect();
    const sRect = secondarySiteBox.getBoundingClientRect();
    if (sRect.width > 80 && sRect.left > pRect.left + 100) {
      const x1 = pRect.right - stageRect.left;
      const x2 = sRect.left - stageRect.left;
      const cx = (x1 + x2) / 2;
      const midY = (Math.max(pRect.top, sRect.top) + Math.min(pRect.bottom, sRect.bottom)) / 2 - stageRect.top;
      const isLight = body.classList.contains('light-mode');

      if (scenario === 'rack-aware') {
        const isSan = site1StorageMode === 'san';
        const topY = midY - 14;
        const botY = midY + 14;
        const topColor = site1Offline
          ? 'rgba(244, 63, 94, 0.35)'
          : (isSan ? 'rgba(147, 51, 234, 0.6)' : 'rgba(14, 165, 233, 0.6)');
        const botColor = site1Offline
          ? 'rgba(244, 63, 94, 0.35)'
          : (isSan ? 'rgba(192, 38, 211, 0.6)' : 'rgba(16, 185, 129, 0.6)');

        // Soft glowing replication conduit backing
        ctx.save();
        ctx.fillStyle = isSan ? 'rgba(147, 51, 234, 0.08)' : 'rgba(14, 165, 233, 0.08)';
        ctx.beginPath();
        ctx.roundRect(x1 + 2, topY - 9, Math.max(8, x2 - x1 - 4), 46, 8);
        ctx.fill();
        ctx.restore();

        // Top Lane: 1 Way There (Zone 1 -> Zone 2)
        ctx.save();
        ctx.strokeStyle = topColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1 + 2, topY);
        ctx.lineTo(x2 - 4, topY);
        ctx.stroke();
        ctx.restore();
        drawArrowhead(ctx, x2 - 2, topY, 1, topColor);

        // Bottom Lane: 1 Way Back (Zone 2 -> Zone 1)
        ctx.save();
        ctx.strokeStyle = botColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x2 - 2, botY);
        ctx.lineTo(x1 + 4, botY);
        ctx.stroke();
        ctx.restore();
        drawArrowhead(ctx, x1 + 2, botY, -1, botColor);

        // Compact Replication Label Pill above the conduit (sized to fit inside the gap)
        ctx.save();
        const tagText = isSan ? '<5ms' : '<1ms';
        ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
        const tw = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
        ctx.strokeStyle = isSan ? 'rgba(147, 51, 234, 0.55)' : 'rgba(14, 165, 233, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, topY - 24, tw, 16, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isSan ? (isLight ? '#6d28d9' : '#d8b4fe') : (isLight ? '#0369a1' : '#7dd3fc');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, cx, topY - 16);
        ctx.restore();
      } else {
        // Hyper-V Replica: Single One-Way Async VM Replication Line (Site 1 -> Site B)
        const lineColor = hvReplicationOn
          ? (site1Offline ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.65)')
          : 'rgba(148, 163, 184, 0.35)';

        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.setLineDash(hvReplicationOn ? [] : [5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1 + 2, midY);
        ctx.lineTo(x2 - 4, midY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        drawArrowhead(ctx, x2 - 2, midY, 1, lineColor);

        ctx.save();
        const tagText = hvReplicationOn ? 'ASYNC' : 'IDLE';
        ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
        const tw = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, midY - 20, tw, 16, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hvReplicationOn ? (isLight ? '#047857' : '#6ee7b7') : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, cx, midY - 12);
        ctx.restore();
      }
    }
  }

  // Draw ambient particles (round dots for Control Plane vs rectangular Storage/VM blocks for Replication)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += p.speed;
    if (p.t >= 1) {
      particles.splice(i, 1);
      continue;
    }
    let x;
    let y;
    if (p.curve) {
      const pt = cubicBezierPt(p.p0, p.p1, p.p2, p.p3, p.t);
      x = pt.x;
      y = pt.y;
    } else {
      x = p.sx + (p.tx - p.sx) * p.t;
      y = p.sy + (p.ty - p.sy) * p.t;
    }
    const alpha = Math.sin(p.t * Math.PI);

    ctx.save();
    ctx.globalAlpha = alpha * 0.88;
    ctx.shadowBlur = 5;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    if (p.shape === 'block') {
      const bw = p.w || 8;
      const bh = p.h || 4;
      ctx.beginPath();
      ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw "+ Create Local VM" & Update Manager command comet bursts (supports curved Azure Arc link + pill labels)
  for (let i = commandBursts.length - 1; i >= 0; i--) {
    const b = commandBursts[i];
    b.t += (b.speed || 0.012);
    if (b.t >= 1) {
      if (b.onArrive) b.onArrive();
      commandBursts.splice(i, 1);
      continue;
    }
    let x;
    let y;
    if (b.curve) {
      const pt = cubicBezierPt(b.p0, b.p1, b.p2, b.p3, b.t);
      x = pt.x;
      y = pt.y;
    } else {
      x = b.sx + (b.tx - b.sx) * b.t;
      y = b.sy + (b.ty - b.sy) * b.t;
    }

    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = b.color;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(x, y, 12.5, 0, Math.PI * 2);
    ctx.stroke();

    if (b.label) {
      const isLight = body.classList.contains('light-mode');
      ctx.shadowBlur = 8;
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      const tw = ctx.measureText(b.label).width + 16;
      const pillX = x + 16;
      const pillY = y - 9.5;
      ctx.fillStyle = isLight ? '#fffbeb' : '#1e293b';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, tw, 19, 999);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = isLight ? '#b45309' : '#fde68a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, pillX + tw / 2, pillY + 9.5);
    }
    ctx.restore();
  }

  requestAnimationFrame(animateCanvas);
}

// ============================================================================
// TOOLTIP TOASTS & INITIALIZATION
// ============================================================================
const infoToast = document.getElementById('infoToast');
const toastIcon = document.getElementById('toastIcon');
const toastTitle = document.getElementById('toastTitle');
const toastBody = document.getElementById('toastBody');
const closeToast = document.getElementById('closeToast');
let toastTimer = null;

function showToast(title, desc, iconSrc) {
  toastTitle.textContent = title;
  toastBody.textContent = desc;
  toastIcon.src = iconSrc;
  infoToast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => infoToast.classList.remove('visible'), 6000);
}

document.querySelectorAll('[data-tip]').forEach(el => {
  el.addEventListener('click', e => {
    e.stopPropagation();
    const [title, desc, icon] = el.getAttribute('data-tip').split('|');
    showToast(title, desc, icon);
  });
});

closeToast.addEventListener('click', () => infoToast.classList.remove('visible'));
document.addEventListener('click', () => {
  infoToast.classList.remove('visible');
});

// Initialize clean default Site 1 view & Dedicated 3-Node Management Cluster!
buildStandardPrimaryCluster();
buildManagementCluster();
updateCatalogTriggerButton();
resizeCanvas();
requestAnimationFrame(animateCanvas);

// Subtle live telemetry fluctuation for Compute & NVMe bars
setInterval(() => {
  updateContainerLoads(primaryNodesRow);
  if (isTwoSiteScenario()) {
    updateContainerLoads(secondaryNodesRow);
  }
}, 3500);
