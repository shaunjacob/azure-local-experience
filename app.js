const body = document.body;
const btnConnected = document.getElementById('btnConnected');
const btnDisconnected = document.getElementById('btnDisconnected');
const btnAddVm = document.getElementById('btnAddVm');
const btnAddVmRack = document.getElementById('btnAddVmRack');
const btnThemeToggle = document.getElementById('btnThemeToggle');
const deployChooser = document.getElementById('deployChooser');
const deployOptionGrid = document.getElementById('deployOptionGrid');
const btnConfirmDeploy = document.getElementById('btnConfirmDeploy');
const aksPodReplicaControls = document.getElementById('aksPodReplicaControls');
const aksPodReplicaCount = document.getElementById('aksPodReplicaCount');
const cvmAttestationStatus = document.getElementById('cvmAttestationStatus');
const cvmAttestationBadge = document.getElementById('cvmAttestationBadge');

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

const primaryWorkloadsRow = document.getElementById('primaryWorkloadsRow');
const secondaryWorkloadsRow = document.getElementById('secondaryWorkloadsRow');
const primaryNodesRow = document.getElementById('primaryNodesRow');
const secondaryNodesRow = document.getElementById('secondaryNodesRow');
const primaryComputeRailSub = document.getElementById('primaryComputeRailSub');
const secondaryComputeRailSub = document.getElementById('secondaryComputeRailSub');
const primaryStorageRailSub = document.getElementById('primaryStorageRailSub');
const secondaryStorageRailSub = document.getElementById('secondaryStorageRailSub');
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
const defaultAsrStandbyHtml = asrStandbyHint.innerHTML;

const visualStage = document.getElementById('visualStage');
const canvas = document.getElementById('flowCanvas');
const ctx = canvas.getContext('2d');

// ============================================================================
// CORE APPLICATION STATE
// ============================================================================
let mode = 'connected'; // 'connected' | 'disconnected'
let scenario = 'default'; // 'default' | 'wan-outage' | 'node-failure' | 'asr' | 'hvreplica' | 'rack-aware'
let cableCut = false;

// Scenario-specific state
let hvSite2Nodes = 2;          // Customizable 1..4 nodes in Site B
let hvReplicationOn = false;   // Step 1: Site-to-site replication active (Hyper-V Replica or ASR Preview)
let twoSiteDrMethod = 'hyperv'; // 'hyperv' | 'asr'
let twoSiteDrBusy = false;
let twoSiteDrRunId = 0;
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
let confidentialStep = 0;
let confidentialBusy = false;
let confidentialRunId = 0;
let deploymentPodCount = 0;
let deploymentRunId = 0;

// Per-cluster storage architecture: 's2d' | 'san' | 'both'
let site1StorageMode = 's2d';
let site2StorageMode = 's2d';

function twoSiteSanOnly() {
  return site1StorageMode === 'san' && site2StorageMode === 'san';
}

function isTwoSiteAsrEligible() {
  return twoSiteSanOnly() && mode === 'connected';
}

function isTwoSiteAsrActive() {
  return scenario === 'hvreplica' && twoSiteDrMethod === 'asr' && isTwoSiteAsrEligible();
}

function syncTwoSitePresentation() {
  if (scenario === 'hvreplica' && twoSiteDrMethod === 'asr' && !isTwoSiteAsrEligible()) {
    twoSiteDrMethod = 'hyperv';
  }
  if (scenario !== 'hvreplica') return;

  headlineText.textContent = 'Disaster Recovery to a 2nd Azure Local Site';
  if (twoSiteDrMethod === 'asr') {
    secondarySiteSub.textContent = twoSiteDrBusy
      ? `ASR (SAN Only · Preview) · ${site1Offline ? 'failover' : 'failback'} in progress`
      : (site1Offline
        ? 'ASR (SAN Only · Preview) · workloads running on Site B'
        : (hvReplicationOn ? 'ASR (SAN Only · Preview) · replicating from Site 1' : 'ASR (SAN Only · Preview) · SAN-to-SAN target site'));
    subheadText.innerHTML = 'With <strong>SAN</strong> attached at both sites, <strong>Azure Site Recovery (Preview)</strong> orchestrates VM replication, failover, and failback directly across Site 1 and Site B.';
  } else {
    secondarySiteSub.textContent = twoSiteDrBusy
      ? `Hyper-V Replica · ${site1Offline ? 'failover' : 'failback'} in progress`
      : (site1Offline
        ? 'Hyper-V Replica · workloads running on Site B'
        : (hvReplicationOn ? 'Hyper-V Replica · syncing from Site 1' : 'Hyper-V Replica target site'));
    subheadText.innerHTML = twoSiteSanOnly()
      ? 'Both sites have <strong>SAN</strong> attached: replicate across sites with <strong>Hyper-V Replica</strong> or choose <strong>ASR (SAN Only) Preview</strong> for Azure-orchestrated recovery.'
      : 'Asynchronous site-to-site VM replication using <strong>Hyper-V Replica</strong> across independent clusters, or select <strong>ASR (SAN Only) Preview</strong> to switch both sites to <strong>SAN</strong>.';
  }
}

function syncTwoSiteStorageControls() {
  const locked = scenario === 'hvreplica' && (site1Offline || twoSiteDrBusy);
  document.querySelectorAll('#datacenterBox .stg-btn, #secondarySiteBox .stg-btn').forEach(button => {
    button.disabled = locked;
    button.title = locked ? 'Reset or complete the recovery walkthrough before changing storage.' : '';
  });
}

const BASE_WORKLOADS = [
  { name: 'App-VM-01', icon: 'icons/vm.svg', cls: '', replicable: true },
  { name: 'AKS-Node-01', icon: 'icons/aks.svg', cls: 'aks', replicable: false, initialPods: 2 },
  { name: 'SQL-Srv-01', icon: 'icons/sql-mi.svg', cls: 'sql', replicable: true },
  { name: 'AKS-Node-02', icon: 'icons/aks.svg', cls: 'aks', replicable: false, initialPods: 2 },
  { name: 'Web-VM-02', icon: 'icons/vm.svg', cls: '', replicable: true },
  { name: 'AKS-Node-03', icon: 'icons/aks.svg', cls: 'aks', replicable: false, initialPods: 2 },
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
function getWorkloadBox(col) {
  return col?.workloadSlot || col?.querySelector('.node-workloads') || null;
}

function getHostColumnFromElement(el) {
  if (!el) return null;
  return el.closest('.node-column') || el.closest('.node-workloads')?.hostColumn || null;
}

function getWorkerPodCount(workerPill) {
  return Math.max(0, Number(workerPill?.dataset.podCount || 0));
}

function setWorkerPodCount(workerPill, count, options = {}) {
  if (!workerPill) return;
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  workerPill.dataset.podCount = String(safeCount);
  let badge = workerPill.querySelector('.aks-pod-count-pill');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'aks-pod-count-pill';
    const removeBtn = workerPill.querySelector(':scope > .workload-remove');
    if (removeBtn) {
      workerPill.insertBefore(badge, removeBtn);
    } else {
      workerPill.appendChild(badge);
    }
  }
  badge.textContent = `${safeCount} ${safeCount === 1 ? 'Pod' : 'Pods'}`;
  badge.classList.toggle('idle-ready', safeCount === 0);
  badge.classList.toggle('boosted', Boolean(options.boosted) && safeCount > 0);
  badge.title = safeCount === 0
    ? '0 application pods running · worker node Ready for scheduling'
    : `${safeCount} application ${safeCount === 1 ? 'pod' : 'pods'} running on ${workerPill.dataset.vmName || 'AKS worker'}`;
}

function createVmPillElement(w) {
  const div = document.createElement('div');
  div.className = `vm-pill ${w.cls || ''} ${w.extraClass || ''} ${w.removable ? 'is-removable' : ''}`.trim();
  div.dataset.replicable = w.replicable ? 'true' : 'false';
  div.dataset.vmName = w.name;
  div.dataset.workloadKind = w.kind || (w.cls === 'aks' ? 'aks-node' : 'vm');
  div.innerHTML = `<span class="run-dot"></span><img src="${w.icon}" alt="" /><span class="pill-name">${w.name}</span>`;
  if (div.dataset.workloadKind === 'aks-node') {
    const initialPods = typeof w.initialPods === 'number' ? w.initialPods : 0;
    setWorkerPodCount(div, initialPods);
  }
  if (w.removable) {
    const removeButton = createWorkloadRemoveButton(w.name, button => removeSimulatedWorkload(div, button));
    div.appendChild(removeButton);
  }
  return div;
}

function createWorkloadRemoveButton(name, onRemove) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'workload-remove';
  button.textContent = '×';
  button.setAttribute('aria-label', `Remove ${name}`);
  button.title = `Remove ${name}`;
  button.addEventListener('click', event => {
    event.stopPropagation();
    onRemove(button);
  });
  return button;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(min, max, val) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function createNodeColumnElement(label, index, computeLabel = 'CPU', nvmeLabel = 'Memory', allowClickFail = false, workloadsRow = null) {
  const col = document.createElement('div');
  col.className = 'node-column';
  col.dataset.nodeIndex = String(index);
  // Assign distinct randomized per-node baseline offsets for Compute & Memory
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
  `;

  const workloadSlot = document.createElement('div');
  workloadSlot.className = 'node-workloads workload-host-slot';
  workloadSlot.dataset.nodeIndex = String(index);
  workloadSlot.hostColumn = col;
  col.workloadSlot = workloadSlot;
  if (workloadsRow) {
    workloadsRow.appendChild(workloadSlot);
  }

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
    const workloadBox = getWorkloadBox(col);

    if (col.classList.contains('offline')) {
      if (cpuBar) cpuBar.style.width = '0%';
      if (nvmeBar) nvmeBar.style.width = '0%';
      if (cpuLabel) cpuLabel.textContent = 'OFFLINE';
      if (nvmeLabel) nvmeLabel.textContent = 'OFFLINE';
      return;
    }

    const realVms = workloadBox ? workloadBox.querySelectorAll('.vm-pill').length : 0;
    const ghosts = workloadBox ? workloadBox.querySelectorAll('.ghost-replica-pill').length : 0;
    const cpuJ = Number(col.dataset.cpuJitter || 0) + randInt(-2, 2);
    const nvmeJ = Number(col.dataset.nvmeJitter || 0) + randInt(-2, 2);

    let cpuPct;
    let nvmePct;
    if (realVms > 0) {
      cpuPct = clamp(22, 93, 21 + realVms * 16 + cpuJ);
      nvmePct = clamp(19, 91, 18 + realVms * 14 + nvmeJ);
    } else if (ghosts > 0) {
      // Replica standby: low CPU overhead, moderate Memory reservation
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
  if (primaryWorkloadsRow) {
    primaryWorkloadsRow.className = 'physical-servers-row cols-4';
    primaryWorkloadsRow.innerHTML = '';
  }
  primaryNodesRow.className = 'physical-servers-row cols-4';
  primaryNodesRow.innerHTML = '';
  if (primaryComputeRailSub) primaryComputeRailSub.textContent = 'Nodes 1–4 Hardware';

  for (let i = 1; i <= 4; i++) {
    const cpuLbl = i === 4 ? 'CPU & GPU' : 'CPU';
    const col = createNodeColumnElement(`Node ${i}`, i, cpuLbl, 'Memory', true, primaryWorkloadsRow);
    primaryNodesRow.appendChild(col);
  }
  const cols = Array.from(primaryNodesRow.children);
  BASE_WORKLOADS.forEach((w, idx) => {
    const targetCol = cols[Math.floor(idx / 2) % cols.length];
    getWorkloadBox(targetCol).appendChild(createVmPillElement(w));
  });
  updateContainerLoads(primaryNodesRow);
}

// Build Site 2 Cluster for Hyper-V Replica (1..4 customizable nodes)
function buildHvReplicaSite2Cluster() {
  if (secondaryWorkloadsRow) {
    secondaryWorkloadsRow.className = `physical-servers-row cols-${hvSite2Nodes}`;
    secondaryWorkloadsRow.innerHTML = '';
  }
  secondaryNodesRow.className = `physical-servers-row cols-${hvSite2Nodes}`;
  secondaryNodesRow.innerHTML = '';
  if (secondaryComputeRailSub) {
    secondaryComputeRailSub.textContent = hvSite2Nodes === 1 ? 'Node 1 Hardware' : `Nodes 1–${hvSite2Nodes} Hardware`;
  }
  secondaryClusterTitle.textContent = `${hvSite2Nodes}-Node Cluster`;
  if (scenario === 'hvreplica') {
    secondarySiteTitle.textContent = `Site B · ${hvSite2Nodes}-Node Cluster`;
  }

  for (let i = 1; i <= hvSite2Nodes; i++) {
    const col = createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Memory', false, secondaryWorkloadsRow);
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
    const workloads = getWorkloadBox(c);
    if (!workloads) return;
    workloads.querySelectorAll('.ghost-replica-pill, .idle-slot-hint').forEach(element => element.remove());
    c.querySelector('.pwr-text').textContent = workloads.querySelector('.vm-pill')
      ? 'ONLINE'
      : (hvReplicationOn ? 'REPLICA' : 'STANDBY');
  });

  if (hvReplicationOn) {
    const isAsr = isTwoSiteAsrActive();
    const replicablePills = Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill[data-replicable="true"]'));
    replicablePills.forEach((pill, idx) => {
      const destBox = getWorkloadBox(site2Cols[idx % site2Cols.length]);
      if (!destBox) return;
      const ghost = document.createElement('div');
      ghost.className = isAsr ? 'ghost-replica-pill asr-replica' : 'ghost-replica-pill';
      ghost.dataset.vmName = pill.dataset.vmName;
      ghost.textContent = isAsr ? `◌ ${pill.dataset.vmName} (ASR)` : `◌ ${pill.dataset.vmName} (Replica)`;
      destBox.appendChild(ghost);
    });
    secondaryClusterSub.textContent = isAsr
      ? 'ASR (Preview) replicating SAN-backed VMs directly from Site 1 to Site B'
      : 'Hyper-V Replica syncing changes every 30s / 5m / 15m';
  } else {
    const isAsr = isTwoSiteAsrActive();
    site2Cols.forEach(c => {
      const workloads = getWorkloadBox(c);
      if (!workloads || workloads.querySelector('.vm-pill')) return;
      const hint = document.createElement('div');
      hint.className = 'idle-slot-hint';
      hint.textContent = isAsr ? 'Ready for ASR replication' : 'Ready for replication';
      workloads.appendChild(hint);
    });
    secondaryClusterSub.textContent = isAsr
      ? 'Start ASR (Preview) to replicate SAN-backed VMs from Site 1 to Site B.'
      : 'Start Hyper-V Replica to replicate Site 1 VMs to Site B.';
  }
  updateContainerLoads(secondaryNodesRow);
}

// Build Unified Rack-Aware Cluster (Equal 1..4 nodes in Zone 1 & Zone 2)
function buildRackAwareClusters() {
  if (primaryWorkloadsRow) {
    primaryWorkloadsRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
    primaryWorkloadsRow.innerHTML = '';
  }
  if (secondaryWorkloadsRow) {
    secondaryWorkloadsRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
    secondaryWorkloadsRow.innerHTML = '';
  }
  primaryNodesRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
  secondaryNodesRow.className = `physical-servers-row cols-${rackNodesPerZone}`;
  primaryNodesRow.innerHTML = '';
  secondaryNodesRow.innerHTML = '';

  const hwLabel = rackNodesPerZone === 1 ? 'Node 1 Hardware' : `Nodes 1–${rackNodesPerZone} Hardware`;
  if (primaryComputeRailSub) primaryComputeRailSub.textContent = hwLabel;
  if (secondaryComputeRailSub) secondaryComputeRailSub.textContent = hwLabel;

  const nodeWord = `${rackNodesPerZone} Node${rackNodesPerZone > 1 ? 's' : ''}`;
  primarySiteTitle.textContent = `Site 1 · Zone 1 (${nodeWord})`;
  secondarySiteTitle.textContent = `Site 2 · Zone 2 (${nodeWord})`;
  primaryClusterTitle.textContent = `Zone 1 · ${nodeWord}`;
  secondaryClusterTitle.textContent = `Zone 2 · ${nodeWord}`;

  for (let i = 1; i <= rackNodesPerZone; i++) {
    primaryNodesRow.appendChild(createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Memory', false, primaryWorkloadsRow));
    secondaryNodesRow.appendChild(createNodeColumnElement(`Node ${i}`, i, 'CPU', 'Memory', false, secondaryWorkloadsRow));
  }

  // Distribute active VMs & AKS nodes evenly across BOTH Zone 1 and Zone 2 simultaneously!
  const z1Cols = Array.from(primaryNodesRow.children);
  const z2Cols = Array.from(secondaryNodesRow.children);
  const zoneMap = [0, 0, 1, 1, 1, 0, 0, 1]; // mixes VMs, SQL, AI & AKS across both zones
  BASE_WORKLOADS.forEach((w, idx) => {
    const targetZoneCols = zoneMap[idx % zoneMap.length] === 0 ? z1Cols : z2Cols;
    const col = targetZoneCols[Math.floor(idx / 2) % targetZoneCols.length];
    getWorkloadBox(col).appendChild(createVmPillElement(w));
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
    rackAwareStorageFooter.innerHTML = '⇄ Enterprise SAN Only · Synchronously Replicated Across Zone 1 &amp; Zone 2 (&lt; 5 ms Latency · Zero Data Loss)';
    rackAwareStorageFooter.setAttribute('data-tip', 'Rack Aware SAN Only (< 5 ms)|In a Rack Aware cluster using External SAN Only, storage arrays replicate synchronously across Zone 1 & Zone 2 with a latency requirement of < 5 ms.|icons/san-array.svg');
    if (raMeta) {
      raMeta.textContent = 'SAN Only (< 5 ms Latency) · Zero Data Loss';
    }
    if (scenario === 'rack-aware' && secondarySiteSub) {
      secondarySiteSub.textContent = 'Availability Zone 2 · SAN (< 5 ms)';
    }
  } else {
    rackAwareStorageFooter.innerHTML = '⇄ Single S2D Pool · Synchronously Mirrored Across Zone 1 &amp; Zone 2 (&lt; 1 ms RDMA · Zero Data Loss)';
    rackAwareStorageFooter.setAttribute('data-tip', 'Rack Aware S2D Only (< 1 ms)|In a Rack Aware cluster using Storage Spaces Direct (S2D Only), internal NVMe drives mirror synchronously across Zone 1 & Zone 2 requiring < 1 ms RDMA latency.|icons/azure-local.svg');
    if (raMeta) {
      raMeta.textContent = 'S2D Only (< 1 ms RDMA) · Zero Data Loss';
    }
    if (scenario === 'rack-aware' && secondarySiteSub) {
      secondarySiteSub.textContent = 'Availability Zone 2 · S2D (< 1 ms)';
    }
  }
}

function applyClusterStorageMode(siteNum, nextStgMode, announce = false) {
  let switchedFromAsrToHyperv = false;
  if (scenario === 'hvreplica' && announce && (site1Offline || twoSiteDrBusy)) {
    showToast('Recovery In Progress', 'Complete failback or clear the scenario before changing storage.', 'icons/san-array.svg');
    return;
  }

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

  if (scenario === 'hvreplica' && twoSiteDrMethod === 'asr' && !twoSiteSanOnly()) {
    stopDemoAutoPlay();
    hvReplicationOn = false;
    twoSiteDrMethod = 'hyperv';
    switchedFromAsrToHyperv = true;
  }

  const syncSingleSiteDom = (enclosure, s2dBar, sanBlock, railSubEl, toggleRoots, stgMode) => {
    if (!enclosure) return;
    enclosure.dataset.siteStorage = stgMode;
    if (s2dBar) s2dBar.hidden = stgMode === 'san';
    if (sanBlock) sanBlock.hidden = stgMode === 's2d';
    if (railSubEl) {
      railSubEl.textContent = stgMode === 'san' ? 'External SAN' : (stgMode === 'both' ? 'S2D + SAN' : 'S2D Pool');
    }
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
    primaryStorageRailSub,
    Array.from(document.querySelectorAll('.storage-mode-toggle[data-storage-site="1"]')),
    site1StorageMode
  );

  syncSingleSiteDom(
    secondaryClusterEnclosure,
    secondaryStorageBar,
    secondarySanBlock,
    secondaryStorageRailSub,
    Array.from(document.querySelectorAll('.storage-mode-toggle[data-storage-site="2"]')),
    site2StorageMode
  );

  applyRackAwareStorageFooterText();
  if (scenario === 'hvreplica') {
    syncTwoSitePresentation();
    renderHvSite2StandbyState();
    if (announce) renderScenarioControlBar();
  }
  setTimeout(resizeCanvas, 80);

  if (announce) {
    if (switchedFromAsrToHyperv) {
      showToast(
        'Switched to Hyper-V Replica',
        'S2D exists on at least one site, so 2nd Site DR switched to Hyper-V Replica. Select ASR (SAN Only) Preview anytime to switch both sites back to SAN.',
        'icons/azure-local.svg'
      );
      return;
    }
    const isRa = scenario === 'rack-aware';
    const titles = {
      s2d: isRa ? 'Rack Aware S2D Only (< 1 ms RDMA)' : 'Storage Spaces Direct (S2D Only)',
      san: isRa ? 'Rack Aware SAN Only (< 5 ms Latency)' : 'External SAN Only (Disaggregated)',
      both: 'Hybrid Storage: S2D + External SAN'
    };
    const descs = {
      s2d: isRa
        ? 'Rack Aware S2D mirrors internal NVMe synchronously across Zone 1 & Zone 2 (requires < 1 ms RDMA latency).'
        : 'Hyperconverged internal NVMe/SSD drives pooled across cluster nodes into shared CSVs.',
      san: isRa
        ? 'Rack Aware SAN only cluster across Zone 1 & Zone 2 with synchronous array replication (supports < 5 ms latency).'
        : 'Disaggregated compute nodes connected via Fibre Channel or iSCSI to an external enterprise SAN array.',
      both: 'Internal S2D NVMe pool running side-by-side with external Fibre Channel / iSCSI SAN CSVs on the same cluster.'
    };
    showToast(titles[nextStgMode], descs[nextStgMode], nextStgMode === 's2d' ? 'icons/azure-local.svg' : 'icons/san-array.svg');
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
  if (!pill.isConnected) return;
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
  closeDeployChooser(false);

  // Cloud-only scenarios reset cleanly if switching to Disconnected Mode
  if (nextMode === 'disconnected' && (scenario === 'wan-outage' || scenario === 'asr' || scenario === 'update-manager' ||
      scenario === 'confidential-computing' ||
      (scenario === 'hvreplica' && twoSiteDrMethod === 'asr' && (site1Offline || twoSiteDrBusy)))) {
    selectScenario('default');
  } else if (nextMode === 'disconnected' && scenario === 'hvreplica' && twoSiteDrMethod === 'asr') {
    stopDemoAutoPlay();
    hvReplicationOn = false;
    twoSiteDrMethod = 'hyperv';
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
    const aiTile = document.getElementById('localAiServiceTile');
    const ribSub = document.getElementById('servicesRibbonSub');
    if (sqlSub) sqlSub.textContent = 'SQL Server on Local VMs';
    if (aiSub) aiSub.textContent = 'Foundry Local & local AI containers';
    if (aiTile) aiTile.dataset.tip = 'Foundry Local on Azure Local|Disconnected deployment uses locally imported dependencies and model artifacts with local identity. Inference runs locally and does not require public-cloud connectivity.|icons/ai.svg';
    if (ribSub) ribSub.textContent = 'Disconnected Mode: Local VMs, AKS, ACR, SQL on VMs, Foundry Local & AI Containers active (AVD requires Cloud)';

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
    const aiTile = document.getElementById('localAiServiceTile');
    const ribSub = document.getElementById('servicesRibbonSub');
    if (sqlSub) sqlSub.textContent = 'Arc-Enabled SQL on VMs';
    if (aiSub) aiSub.textContent = 'Foundry Local & Edge RAG';
    if (aiTile) aiTile.dataset.tip = 'Local AI — Foundry Local, Edge RAG & Azure AI Containers|Connected Mode supports Foundry Local, Edge RAG & Azure ML. Foundry Local inference runs on Azure Local; model availability depends on the configured deployment.|icons/ai.svg';
    if (ribSub) ribSub.textContent = 'Supported in Connected Mode — switch to Disconnected Mode to compare';

    document.querySelectorAll('[data-cloud-only="true"]').forEach(el => el.classList.remove('cloud-only-dim'));

    moveControlPlaneTo(cloudDock, 'Unified Cloud Management & Governance');
  }

  if (scenario === 'hvreplica') {
    syncTwoSitePresentation();
    renderHvSite2StandbyState();
    renderScenarioControlBar();
  }
  setTimeout(resizeCanvas, 260);
  setTimeout(resizeCanvas, 820);
}

btnConnected.addEventListener('click', () => setMode('connected'));
btnDisconnected.addEventListener('click', () => setMode('disconnected'));

body.classList.add('light-mode');
if (btnThemeToggle) {
  btnThemeToggle.hidden = true;
  btnThemeToggle.disabled = true;
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
    ruleSummary: 'VM Replication & Cloud Failover',
    category: 'Resiliency & DR',
    iconHtml: '<img src="icons/asr.svg" alt="" />',
    accent: 'accent-purple',
    cloudOnly: true,
    desc: 'Replicate local VM disks to Azure Storage and use a Recovery Services vault to coordinate failover to Azure.',
    chips: ['RPO as Low as 30s', 'Cloud Failover & Failback']
  },
  {
    id: 'hvreplica',
    title: '2nd Site DR',
    shortLabel: '2nd Site DR',
    bentoSub: 'Site-to-Site Recovery',
    ruleSummary: 'Hyper-V Replica (S2D/SAN) · ASR Preview (SAN-to-SAN)',
    category: 'Resiliency & DR',
    iconHtml: '<img src="icons/azure-local.svg" alt="" />',
    accent: 'accent-emerald',
    cloudOnly: false,
    desc: 'Replicate VMs across two Azure Local sites—using Hyper-V Replica when S2D is present, or Azure Site Recovery (Preview) when both sites use SAN.',
    chips: ['1 to 4 Nodes in Site B', 'Hyper-V Replica', 'ASR Preview (SAN)']
  },
  {
    id: 'rack-aware',
    title: 'Rack Aware Cluster',
    shortLabel: 'Rack Aware Cluster',
    bentoSub: 'Sync Availability Zones',
    ruleSummary: 'Sync Availability Zones (0 Data Loss)',
    category: 'Resiliency & DR',
    iconHtml: '🔗',
    accent: '',
    cloudOnly: false,
    desc: 'Span one single cluster across two rooms or buildings (1+1 up to 4+4) using S2D Only (< 1 ms RDMA) or SAN Only (< 5 ms) with zero data loss sync storage.',
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
  },
  {
    id: 'confidential-computing',
    title: 'Confidential Computing',
    shortLabel: 'Confidential Computing',
    bentoSub: 'Attest Before Key Release',
    ruleSummary: 'Hardware-backed attestation & secure key release',
    category: 'Security & Confidentiality',
    iconHtml: '<img src="icons/key-vault.svg" alt="" />',
    accent: 'accent-purple',
    cloudOnly: true,
    desc: 'Follow an Azure Local confidential VM through hardware-backed attestation, policy-gated Azure Key Vault key release, and a denied claim.',
    chips: ['AMD SEV-SNP Hardware', 'Microsoft Azure Attestation', 'Connected Mode Only']
  }
];

let activeCatalogCategory = 'All';
let catalogSearchQuery = '';
let c1DrawerOpen = false;
let c1DrawerCategory = 'All';
let hasOpenedScenarioPicker = false;

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
    const modeUnsupported = item.id === 'confidential-computing' && (mode === 'disconnected' || cableCut);
    const modeTagHtml = item.cloudOnly
      ? `<span class="card-mode-tag cloud-only">${modeUnsupported ? (cableCut ? 'Unavailable during WAN outage' : 'Unavailable in Disconnected Mode') : '☁️ Connected Mode'}</span>`
      : `<span class="card-mode-tag">✓ Connected &amp; Air-Gapped</span>`;

    return `
      <button type="button" class="catalog-card ${isActive ? 'active' : ''} ${modeUnsupported ? 'catalog-card-disabled' : ''}" data-launch-scenario="${item.id}" ${modeUnsupported ? 'disabled aria-disabled="true"' : ''}>
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
          <span>${modeUnsupported ? (cableCut ? 'Restore Azure connectivity to launch' : 'Requires connected Azure services') : (isActive ? '● Currently Active on Stage' : 'Launch Interactive Demo')}</span>
          <span>${modeUnsupported ? '🔒' : (isActive ? '✓' : '→')}</span>
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
  if (e.key === 'Escape' && deployChooser && !deployChooser.hidden) {
    e.preventDefault();
    closeDeployChooser();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && (!deployChooser || deployChooser.hidden)) {
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
  deploymentRunId += 1;
  deploymentPodCount = 0;
  confidentialRunId += 1;
  confidentialStep = 0;
  confidentialBusy = false;
  cableCut = false;
  hvReplicationOn = false;
  twoSiteDrMethod = 'hyperv';
  twoSiteDrBusy = false;
  twoSiteDrRunId += 1;
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
    'scenario-policy',
    'scenario-confidential-computing',
    'cvm-attested',
    'cvm-key-released',
    'cvm-policy-denied'
  );
  if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Waiting for confidential VM evidence';
  if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Attestation service';

  datacenterBox.classList.remove('site-outage');
  rackAwareHeader.hidden = true;
  rackAwareStorageFooter.hidden = true;

  // Reset ASR Cloud Bay
  asrCloudVmSlot.querySelectorAll('.vm-pill').forEach(p => p.remove());
  asrStandbyHint.style.display = '';
  asrStandbyHint.innerHTML = defaultAsrStandbyHtml;
  asrStatusSub.textContent = 'VM disks replicating to Azure Storage · RPO as low as 30s';

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
  closeDeployChooser(false);
  if (nextScenario === 'confidential-computing' && (mode === 'disconnected' || cableCut)) {
    showToast(
      'Connected Mode Required',
      'The documented Azure Local confidential VM attestation and secure key release flow requires an active connection to Azure.',
      'icons/key-vault.svg'
    );
    return;
  }
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
    subheadText.innerHTML = 'Continuous purple replication copies local VM disks to <strong>Azure Storage</strong>, with a Recovery Services vault coordinating cloud failover.';
    renderScenarioControlBar();
  } else if (scenario === 'hvreplica') {
    body.classList.add('scenario-hvreplica');
    primarySiteTitle.textContent = 'Site 1 · 4-Node Cluster';
    secondarySiteTitle.textContent = `Site B · ${hvSite2Nodes}-Node Cluster`;
    syncTwoSitePresentation();
    buildHvReplicaSite2Cluster();
    renderScenarioControlBar();
  } else if (scenario === 'rack-aware') {
    body.classList.add('scenario-rack-aware');
    rackAwareHeader.hidden = false;
    rackAwareStorageFooter.hidden = false;
    dcStatusSub.textContent = 'Availability Zone 1 (Room A)';
    headlineText.textContent = 'Rack Aware Cluster Across Two Availability Zones';
    subheadText.innerHTML = 'Site 1 and Site 2 form <strong>one single cluster</strong> with synchronous storage (< 1 ms S2D or < 5 ms SAN) for zero data loss failover.';
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
  } else if (scenario === 'confidential-computing') {
    headlineText.textContent = 'Confidential Computing — Verify Before Trust';
    subheadText.innerHTML = 'Follow a confidential VM from hardware-backed attestation to policy-gated key release. Workload data stays on-premises; attestation and Azure Key Vault are cloud services.';
    body.classList.add('scenario-confidential-computing');
    cvmAttestationStatus.textContent = 'Waiting for confidential VM evidence';
    cvmAttestationBadge.textContent = 'Attestation service';
    renderScenarioControlBar();
  }

  setTimeout(resizeCanvas, 180);
  setTimeout(resizeCanvas, 680);
}

function sendTwoSiteAsrControlBurst(targetBadges) {
  if (mode !== 'connected' || cableCut) return;
  const origin = getCloudConduitOrigin();
  targetBadges.forEach(badge => {
    if (!badge || badge.getBoundingClientRect().width < 20) return;
    const dest = relCenter(badge);
    commandBursts.push({
      sx: origin.x,
      sy: origin.y,
      tx: dest.x,
      ty: dest.y,
      t: 0,
      color: '#c084fc'
    });
  });
}

function selectTwoSiteDrMethod(method) {
  if (scenario !== 'hvreplica' || !['hyperv', 'asr'].includes(method)) return;
  if (site1Offline || twoSiteDrBusy) {
    showToast('Recovery In Progress', 'Fail back to Site 1 or clear the scenario before switching recovery methods.', 'icons/azure-local.svg');
    return;
  }
  if (method === 'asr' && mode !== 'connected') {
    showToast(
      'Connected Mode Required',
      'ASR (SAN Only) Preview requires Connected Mode so Azure Site Recovery can orchestrate replication between your two sites.',
      'icons/asr.svg'
    );
    return;
  }
  if (method === twoSiteDrMethod && (method !== 'asr' || twoSiteSanOnly())) return;
  stopDemoAutoPlay();
  hvReplicationOn = false;
  let autoSwitchedSan = false;
  if (method === 'asr' && !twoSiteSanOnly()) {
    if (site1StorageMode !== 'san') applyClusterStorageMode(1, 'san', false);
    if (site2StorageMode !== 'san') applyClusterStorageMode(2, 'san', false);
    autoSwitchedSan = true;
  }
  twoSiteDrMethod = method;
  syncTwoSitePresentation();
  renderHvSite2StandbyState();
  renderScenarioControlBar();
  setTimeout(resizeCanvas, 180);
  if (autoSwitchedSan) {
    showToast(
      'ASR (SAN Only) · Preview Selected',
      'Switched Site 1 and Site B storage to External SAN for Azure Site Recovery site-to-site replication (Preview).',
      'icons/asr.svg'
    );
  }
}

function resizeTwoSiteNodes(count) {
  if (site1Offline || twoSiteDrBusy) return;
  if (secondaryWorkloadsRow?.querySelector('.vm-pill')) {
    showToast('Site B Contains Workloads', 'Remove Site B workloads before changing its node count.', 'icons/azure-local.svg');
    return;
  }
  hvSite2Nodes = count;
  buildHvReplicaSite2Cluster();
  renderScenarioControlBar();
  setTimeout(resizeCanvas, 150);
}

function startTwoSiteHypervReplication() {
  if (scenario !== 'hvreplica' || twoSiteDrBusy || site1Offline) return;
  hvReplicationOn = true;
  syncTwoSitePresentation();
  renderHvSite2StandbyState();
  renderScenarioControlBar();
  if (isTwoSiteAsrActive()) {
    sendTwoSiteAsrControlBurst([arcBridgeBadge, arcBridgeBadge2]);
    showToast(
      'ASR Site-to-Site Replication Started (Preview)',
      `Azure Site Recovery is orchestrating SAN-backed VM replication directly from Site 1 to your ${hvSite2Nodes}-node Site B cluster.`,
      'icons/asr.svg'
    );
  } else {
    showToast(
      'Hyper-V Replica Started (Site 1 → Site B)',
      `VMs in Site 1 are now asynchronously replicating across to your ${hvSite2Nodes}-node Site B cluster.`,
      'icons/azure-local.svg'
    );
  }
}

// ============================================================================
// C1 SCENARIOS CONSOLE RENDERER (OPTION P1 TWO-LINE DECK IN EXISTING C1 THEME)
// Line 1: Scenarios Hero Button + Icon + Big Title + Full Description + Clear
// Line 2: Connected Step Track (highlights progress) + [▶ Next Step] + [⏵⏵ Play All]
// ============================================================================
function renderScenarioControlBar() {
  if (!scenarioQuickStrip || !scenarioControlBar) return;
  syncTwoSiteStorageControls();

  const currentIdx = SCENARIO_CATALOG.findIndex(s => s.id === scenario);
  const currentMeta = SCENARIO_CATALOG[currentIdx >= 0 ? currentIdx : 0];
  const scenNum = (currentIdx >= 0 ? currentIdx : 0) + 1;
  const totalScen = SCENARIO_CATALOG.length;

  let stepsData = [];
  let nextActionLabel = '';
  let nextActionCmd = '';
  let canPlayAll = false;
  let extraChipsHtml = '';
  const controlsDisabled = aumBusy || confidentialBusy ||
    (scenario === 'hvreplica' && twoSiteDrBusy);

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
      { num: '1', label: 'Replicating to Azure', state: 'done', attr: '' },
      { num: '2', label: !site1Offline ? 'Failover to Azure Cloud' : 'Running in Azure Cloud', state: !site1Offline ? 'active' : 'done', attr: 'data-c1-asr="failover"' },
      { num: '3', label: 'Failback On-Premises', state: site1Offline ? 'active' : '', attr: 'data-c1-asr="failback"' }
    ];
    nextActionLabel = !site1Offline ? '▶ Next: Failover to Cloud' : '▶ Next: Failback On-Premises';
    nextActionCmd = 'asr-next';
    canPlayAll = true;
  } else if (scenario === 'hvreplica') {
    const methodsLocked = site1Offline || twoSiteDrBusy;
    const asrCanSelect = mode === 'connected';
    const asrTitle = !asrCanSelect
      ? 'ASR (SAN Only) Preview requires Connected Mode.'
      : (!twoSiteSanOnly()
        ? 'Select ASR (SAN Only) Preview and automatically switch Site 1 and Site B storage to External SAN.'
        : 'Azure Site Recovery for Azure Local-to-Azure Local (Preview): replicates and fails over directly across your two SAN-backed sites.');
    extraChipsHtml = `
      <div class="c1-inline-chips" title="Site B Node Count">
        <span class="c1-chip-prefix">Site B:</span>
        ${[1, 2, 3, 4].map(n => `<button class="c1-mini-chip ${hvSite2Nodes === n ? 'active' : ''}" data-s2-count="${n}" type="button" ${methodsLocked ? 'disabled' : ''}>${n}N</button>`).join('')}
      </div>
      <div class="c1-inline-chips two-site-methods" role="group" aria-label="Second-site recovery method">
        <span class="c1-chip-prefix">Method:</span>
        <button type="button" class="c1-mini-chip ${twoSiteDrMethod === 'hyperv' ? 'active' : ''}" data-two-site-method="hyperv" aria-pressed="${twoSiteDrMethod === 'hyperv'}" title="Replicates VMs over a network connection between the two sites (supports S2D, SAN, or hybrid)." ${methodsLocked ? 'disabled' : ''}>Hyper-V Replica</button>
        <button type="button" class="c1-mini-chip ${twoSiteDrMethod === 'asr' ? 'active' : ''} ${!asrCanSelect ? 'is-unavailable' : ''}" data-two-site-method="asr" aria-pressed="${twoSiteDrMethod === 'asr'}" aria-disabled="${methodsLocked || !asrCanSelect}" title="${asrTitle}" ${methodsLocked ? 'disabled' : ''}>ASR (SAN Only) <span class="dr-preview-badge">Preview</span></button>
      </div>
    `;
    const isAsr = isTwoSiteAsrActive();
    const s1Active = !hvReplicationOn && !site1Offline;
    const failingOver = site1Offline && twoSiteDrBusy;
    const failingBack = !site1Offline && twoSiteDrBusy;
    const s2Active = hvReplicationOn && !site1Offline && !twoSiteDrBusy;
    const s3Active = site1Offline && !twoSiteDrBusy;
    stepsData = [
      { num: '1', label: s1Active ? (isAsr ? 'Start ASR Replication' : 'Start Replication') : 'Replicating to Site B', state: s1Active ? 'active' : 'done', attr: 'data-c1-hv="start"' },
      { num: '2', label: failingOver ? 'Failing over to Site B' : (site1Offline || failingBack ? 'Running on Site B' : 'Failover to Site B'), state: s2Active || failingOver ? 'active' : (site1Offline || failingBack ? 'done' : ''), attr: 'data-c1-hv="failover"' },
      { num: '3', label: failingBack ? 'Failing back to Site 1' : 'Failback to Site 1', state: s3Active || failingBack ? 'active' : '', attr: 'data-c1-hv="failback"' }
    ];
    if (failingOver) nextActionLabel = '⏳ Failing over to Site B...';
    else if (failingBack) nextActionLabel = '⏳ Failing back to Site 1...';
    else if (s1Active) nextActionLabel = isAsr ? '▶ Next: Start ASR Replication' : '▶ Next: Start Replication';
    else if (s2Active) nextActionLabel = '▶ Next: Failover to Site B';
    else nextActionLabel = '▶ Next: Failback to Site 1';
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
  } else if (scenario === 'confidential-computing') {
    stepsData = [
      { num: '1', label: confidentialStep === 0 ? 'Deploy Confidential VM' : 'CVM Running On-Premises', state: confidentialStep === 0 ? 'active' : 'done', attr: 'data-c1-cvm="deploy"' },
      { num: '2', label: confidentialStep < 2 ? 'Verify with Azure Attestation' : 'Hardware Evidence Verified', state: confidentialStep === 1 ? 'active' : (confidentialStep >= 2 ? 'done' : ''), attr: 'data-c1-cvm="attest"' },
      { num: '3', label: confidentialStep < 3 ? 'Release Key from Key Vault' : 'Policy-Gated Key Release', state: confidentialStep === 2 ? 'active' : (confidentialStep >= 3 ? 'done' : ''), attr: 'data-c1-cvm="release"' },
      { num: '4', label: 'Reject Mismatched Claim', state: confidentialStep === 3 ? 'active' : (confidentialStep >= 4 ? 'done' : ''), attr: 'data-c1-cvm="deny"' }
    ];
    nextActionLabel = confidentialBusy
      ? '⏳ Verifying trust chain...'
      : (confidentialStep >= 4 ? '↺ Replay Confidential VM Demo' : `▶ Next: ${['Deploy Confidential VM', 'Attest Platform', 'Release Key', 'Reject Mismatched Claim'][confidentialStep]}`);
    nextActionCmd = 'cvm-next';
    canPlayAll = true;
  }

  const stepperNodesHtml = stepsData.map((st, idx) => {
    const connHtml = idx < stepsData.length - 1
      ? `<span class="c1-step-connector ${st.state === 'done' ? 'done' : ''}"></span>`
      : '';
    const checkOrNum = st.state === 'done' ? '✓' : st.num;
    return `
      <button type="button" class="c1-step-box ${st.state}" ${st.attr} ${controlsDisabled ? 'disabled' : ''}>
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
    ? `<button type="button" class="c1-next-step-btn" data-c1-next-action="${nextActionCmd}" ${controlsDisabled ? 'disabled' : ''}>
        ${nextActionLabel}
      </button>`
    : '';

  const playAllBtnHtml = canPlayAll
    ? `<button type="button" class="c1-playall-btn ${demoAutoPlayActive || aumBusy || confidentialBusy ? 'playing' : ''}" data-c1-play-all="true" ${controlsDisabled && !(scenario === 'hvreplica' && demoAutoPlayActive) ? 'disabled' : ''}>
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
      if (twoSiteDrBusy) return;
      if (!hvReplicationOn && !site1Offline) {
        startTwoSiteHypervReplication();
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
    } else if (scenario === 'confidential-computing') {
      if (confidentialStep >= 4) {
        selectScenario('confidential-computing');
      } else {
        advanceConfidentialStep();
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
      if (scenario === 'confidential-computing') {
        selectScenario('confidential-computing');
        demoAutoPlayActive = true;
        renderScenarioControlBar();
        scheduleConfidentialSteps([300, 3200, 6700, 10200]);
        return;
      }
      demoAutoPlayActive = true;

      // Reset current scenario to Step 1 and play through all steps automatically
      const scheduleSteps = (delays) => {
        renderScenarioControlBar();
        delays.forEach((ms, idx) => {
          const runStep = () => {
            if (!demoAutoPlayActive) return;
            if (scenario === 'hvreplica' && twoSiteDrBusy) {
              demoAutoPlayTimers.push(setTimeout(runStep, 100));
              return;
            }
            triggerNextScenarioStep();
            if (idx === delays.length - 1) {
              demoAutoPlayActive = false;
              renderScenarioControlBar();
            }
          };
          demoAutoPlayTimers.push(setTimeout(runStep, ms));
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
        if (resetTwoSiteDrWalkthrough()) scheduleSteps([250, 2600, 5600]);
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

  // 2nd Site DR step handlers
  scenarioQuickStrip.querySelectorAll('[data-s2-count]').forEach(chip => {
    chip.addEventListener('click', () => {
      resizeTwoSiteNodes(Number(chip.getAttribute('data-s2-count')));
    });
  });

  scenarioQuickStrip.querySelectorAll('[data-two-site-method]').forEach(button => {
    button.addEventListener('click', () => selectTwoSiteDrMethod(button.getAttribute('data-two-site-method')));
  });

  scenarioQuickStrip.querySelectorAll('[data-c1-hv]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (twoSiteDrBusy) return;
      stopDemoAutoPlay();
      const action = btn.getAttribute('data-c1-hv');
      if (action === 'start') {
        startTwoSiteHypervReplication();
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

  scenarioQuickStrip.querySelectorAll('[data-c1-cvm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const expectedStep = { deploy: 0, attest: 1, release: 2, deny: 3 }[btn.getAttribute('data-c1-cvm')];
      if (expectedStep === confidentialStep && !confidentialBusy) advanceConfidentialStep();
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
    'rack-aware': 'Rack Aware Cluster',
    'update-manager': 'Updates',
    'policy': 'Azure Policy',
    'confidential-computing': 'Confidential VM'
  };

  if (headerScenariosPicker) {
    const popoverHtml = c1DrawerOpen ? `
      <div class="scn-popover-menu">
        ${SCENARIO_CATALOG.map(s => `
          <button type="button" class="pop-scn-item ${s.id === scenario ? 'active' : ''}" data-opt5-scn="${s.id}" ${s.id === 'confidential-computing' && (mode === 'disconnected' || cableCut) ? 'disabled title="Requires an active connection to Azure Attestation and Key Vault"' : ''}>
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
      <button type="button" class="opt5-header-btn${hasOpenedScenarioPicker ? '' : ' scenario-discovery'}" id="opt5HeaderTriggerBtn">
        ${currentMeta.iconHtml}
        <span>Scenarios: ${SHORT_SCENARIO_LABELS[scenario] || currentMeta.shortLabel}</span>
        <span>${c1DrawerOpen ? '▴' : '▾'}</span>
      </button>
      ${popoverHtml}
    `;

    document.getElementById('opt5HeaderTriggerBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      hasOpenedScenarioPicker = true;
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
          <button type="button" class="m-step-pill ${state}" data-opt5-step="${i}" ${b.disabled ? 'disabled' : ''}>
            <span class="m-step-num">${num}</span>
            <span>${lbl}</span>
          </button>
        `;
      }).join('');

      skywayScenarioStepBar.innerHTML = `
        <strong style="font-size:0.75rem; color:#0284c7;">${currentMeta.shortLabel}:</strong>
        ${extraChipsHtml}
        ${stepsHtml}
        ${nextBtnOrig ? `<button type="button" class="m-next-btn" id="opt5NextProxy" ${nextBtnOrig.disabled ? 'disabled' : ''}>${nextBtnOrig.textContent.trim()}</button>` : ''}
        ${playAllOrig ? `<button type="button" class="m-playall-btn" id="opt5PlayAllProxy" ${playAllOrig.disabled ? 'disabled' : ''}>${playAllOrig.textContent.trim()}</button>` : ''}
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
          resizeTwoSiteNodes(Number(chip.getAttribute('data-s2-count')));
        });
      });
      skywayScenarioStepBar.querySelectorAll('[data-two-site-method]').forEach(button => {
        button.addEventListener('click', () => selectTwoSiteDrMethod(button.getAttribute('data-two-site-method')));
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
  const box = getWorkloadBox(col);
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
    box?.classList.add('offline-lane');
    pwrText.textContent = 'FAILED';

    const remainingOnlineCols = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
    const survivingWorkers = remainingOnlineCols.flatMap(c =>
      Array.from(getWorkloadBox(c)?.querySelectorAll('.vm-pill.aks[data-workload-kind="aks-node"]') || [])
    );

    const pills = box ? Array.from(box.children) : [];
    let rescheduledPodTotal = 0;
    pills.forEach(pill => {
      if (!pill._haHomeSlot) {
        pill._haHomeSlot = box;
      }
      if (pill.dataset.workloadKind === 'aks-node') {
        const lostPods = getWorkerPodCount(pill);
        if (lostPods > 0 && survivingWorkers.length > 0) {
          rescheduledPodTotal += lostPods;
          setWorkerPodCount(pill, 0);
          for (let k = 0; k < lostPods; k++) {
            survivingWorkers.sort((a, b) => getWorkerPodCount(a) - getWorkerPodCount(b));
            setWorkerPodCount(survivingWorkers[0], getWorkerPodCount(survivingWorkers[0]) + 1, { boosted: true });
          }
        }
      }
    });

    pills.forEach((pill, idx) => {
      setTimeout(() => {
        const survivors = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'));
        survivors.sort((a, b) => (getWorkloadBox(a)?.children.length || 0) - (getWorkloadBox(b)?.children.length || 0));
        const destBox = getWorkloadBox(survivors[0]);
        if (destBox) {
          flyWorkloadPill(pill, destBox, true);
          updateContainerLoads(primaryNodesRow);
        }
      }, idx * 200);
    });

    updateContainerLoads(primaryNodesRow);
    renderScenarioControlBar();
    showToast(
      `${nodeLabel} Crashed — Automatic HA Restart!`,
      rescheduledPodTotal > 0
        ? `Kubernetes rescheduled ${rescheduledPodTotal} pods onto healthy AKS workers while Failover Clustering restarted ${nodeLabel}'s VMs & AKS worker onto surviving servers.`
        : `Shared storage preserved every disk, and ${nodeLabel}'s VMs automatically restarted onto healthy servers.`,
      'icons/vm.svg'
    );
  } else {
    col.classList.remove('offline');
    box?.classList.remove('offline-lane');
    pwrText.textContent = 'ONLINE';

    const homePills = Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill'))
      .filter(pill => pill._haHomeSlot === box && pill.parentElement !== box);

    if (homePills.length > 0) {
      homePills.forEach((pill, idx) => {
        setTimeout(() => {
          if (box) {
            flyWorkloadPill(pill, box, false);
            updateContainerLoads(primaryNodesRow);
          }
        }, idx * 160);
      });
    } else {
      const donors = Array.from(primaryNodesRow.querySelectorAll('.node-column:not(.offline)'))
        .filter(c => c !== col && (getWorkloadBox(c)?.children.length || 0) >= 3)
        .sort((a, b) => (getWorkloadBox(b)?.children.length || 0) - (getWorkloadBox(a)?.children.length || 0));

      donors.slice(0, 2).forEach((donor, idx) => {
        const pill = getWorkloadBox(donor)?.lastElementChild;
        if (pill && box) {
          setTimeout(() => {
            flyWorkloadPill(pill, box, false);
            updateContainerLoads(primaryNodesRow);
          }, idx * 160);
        }
      });
    }

    updateContainerLoads(primaryNodesRow);
    renderScenarioControlBar();
  }
}

function setPrimarySiteDownVisual(isDown, statusWord = 'SITE DOWN') {
  datacenterBox.classList.toggle('site-outage', isDown);
  Array.from(primaryNodesRow.querySelectorAll('.node-column')).forEach(col => {
    col.classList.toggle('offline', isDown);
    getWorkloadBox(col)?.classList.toggle('offline-lane', isDown);
    col.querySelector('.pwr-text').textContent = isDown ? statusWord : 'ONLINE';
  });
  updateContainerLoads(primaryNodesRow);
}

function moveTwoSiteWorkloads(records, targetForRecord, onComplete) {
  const runId = ++twoSiteDrRunId;
  twoSiteDrBusy = true;
  records.forEach((record, index) => {
    setTimeout(() => {
      if (runId !== twoSiteDrRunId || scenario !== 'hvreplica' || !evacuatedRecords.includes(record)) return;
      const target = targetForRecord(record, index);
      if (!record.pill.isConnected || !target || !target.isConnected) {
        stopDemoAutoPlay();
        const restored = resetTwoSiteDrWalkthrough();
        if (restored) {
          showToast('Workload Move Interrupted', 'The recovery destination is no longer available. The walkthrough was reset.', 'icons/azure-local.svg');
        }
        return;
      }
      flyWorkloadPill(record.pill, target, true);
      updateContainerLoads(primaryNodesRow);
      updateContainerLoads(secondaryNodesRow);
    }, index * 170);
  });
  const finishDelay = records.length ? (records.length - 1) * 170 + 1450 : 0;
  setTimeout(() => {
    if (runId !== twoSiteDrRunId || scenario !== 'hvreplica') return;
    twoSiteDrBusy = false;
    if (onComplete) onComplete();
    syncTwoSitePresentation();
    renderScenarioControlBar();
  }, finishDelay);
  syncTwoSitePresentation();
  renderScenarioControlBar();
}

function resetTwoSiteDrWalkthrough() {
  twoSiteDrRunId += 1;
  twoSiteDrBusy = false;
  const strandedRecords = [];
  evacuatedRecords.forEach(record => {
    const homeBox = record.homeBox.isConnected ? record.homeBox : primaryWorkloadsRow.querySelector('.node-workloads');
    if (!homeBox) {
      strandedRecords.push(record);
      return;
    }
    record.pill.getAnimations().forEach(animation => animation.cancel());
    record.pill.classList.remove('restarting');
    const label = record.pill.querySelector('.pill-name');
    if (label) label.textContent = record.pill.dataset.vmName;
    homeBox.appendChild(record.pill);
  });
  evacuatedRecords = strandedRecords;
  hvReplicationOn = false;
  site1Offline = false;
  setPrimarySiteDownVisual(false);
  syncTwoSitePresentation();
  renderHvSite2StandbyState();
  renderScenarioControlBar();
  if (strandedRecords.length) {
    stopDemoAutoPlay();
    renderScenarioControlBar();
    showToast('Walkthrough Interrupted', 'Some workloads could not return to Site 1. Clear the scenario to rebuild it.', 'icons/azure-local.svg');
    return false;
  }
  return true;
}

// 2. Azure Site Recovery (Site 1 -> Azure Cloud)
function triggerAsrFailoverToggle() {
  if (!site1Offline) {
    site1Offline = true;
    evacuatedRecords = [];
    Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill[data-replicable="true"]')).forEach(pill => {
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
    asrStatusSub.textContent = 'VM disks replicating to Azure Storage · RPO as low as 30s';
    renderScenarioControlBar();
    showToast(
      'Failback to Site 1 Complete',
      'Delta changes reverse-replicated from Azure and VMs returned cleanly to Site 1.',
      'icons/azure-local.svg'
    );
  }
}

// 3. 2nd Site DR Failover (Site 1 -> Customizable Site B via Hyper-V Replica or ASR Preview)
function triggerHvReplicaFailoverToggle() {
  if (scenario !== 'hvreplica' || twoSiteDrBusy) return;
  const isAsr = isTwoSiteAsrActive();
  if (!site1Offline) {
    if (!hvReplicationOn) {
      hvReplicationOn = true;
    }
    site1Offline = true;
    evacuatedRecords = [];
    Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill[data-replicable="true"]')).forEach(pill => {
      evacuatedRecords.push({ pill, homeBox: pill.parentElement });
    });

    setPrimarySiteDownVisual(true, 'SITE OFFLINE');
    if (isAsr) sendTwoSiteAsrControlBurst([arcBridgeBadge2]);

    const site2Cols = Array.from(secondaryNodesRow.children);
    site2Cols.forEach(c => {
      getWorkloadBox(c)?.querySelectorAll('.ghost-replica-pill, .idle-slot-hint').forEach(element => element.remove());
      c.querySelector('.pwr-text').textContent = 'LIVE · DR';
    });

    secondaryClusterSub.textContent = isAsr
      ? '● ASR FAILOVER ACTIVE — Replicated SAN VMs are now running live on Site B!'
      : '● FAILOVER ACTIVE — Site 1 VMs are now running live on Site B!';
    moveTwoSiteWorkloads(evacuatedRecords, (_, index) =>
      getWorkloadBox(site2Cols[index % site2Cols.length]), () => {
        if (isAsr) {
          showToast(
            'Failed Over to Site B (ASR Preview)!',
            `Azure Site Recovery orchestrated failover of your SAN-backed VMs directly onto Site B's ${hvSite2Nodes}-node cluster.`,
            'icons/asr.svg'
          );
        } else {
          showToast(
            'Failed Over to Site B (Hyper-V Replica)!',
            `Replicated VMs booted on Site B's ${hvSite2Nodes}-node cluster. Register and reconnect them for Azure management if needed.`,
            'icons/azure-local.svg'
          );
        }
      });
  } else {
    site1Offline = false;
    setPrimarySiteDownVisual(false);
    if (isAsr) sendTwoSiteAsrControlBurst([arcBridgeBadge]);

    moveTwoSiteWorkloads([...evacuatedRecords], record => record.homeBox, () => {
      evacuatedRecords = [];
      renderHvSite2StandbyState();
      if (isAsr) {
        showToast(
          'ASR Failback to Site 1 Complete (Preview)',
          'Site 1 is online again — Azure Site Recovery failed VMs back to Site 1 and resumed SAN-to-SAN replication to Site B.',
          'icons/asr.svg'
        );
      } else {
        showToast(
          'Planned Failback to Site 1 Complete',
          'Site 1 is online again — VMs failed back and resumed Hyper-V Replica protection to Site B.',
          'icons/azure-local.svg'
        );
      }
    });
  }
}

// 4. Rack Aware Cluster Zone 1 Offline -> Automatic Zero RPO HA Restart in Zone 2!
function triggerRackAwareZoneFailoverToggle() {
  if (!site1Offline) {
    site1Offline = true;
    evacuatedRecords = [];
    const zone2Workers = Array.from(secondaryWorkloadsRow.querySelectorAll('.vm-pill.aks[data-workload-kind="aks-node"]'));
    // In a Rack Aware cluster with synchronous storage, ALL VMs & AKS nodes in Zone 1 auto-restart in Zone 2!
    Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill')).forEach(pill => {
      if (pill.dataset.workloadKind === 'aks-node' && zone2Workers.length > 0) {
        const lostPods = getWorkerPodCount(pill);
        if (lostPods > 0) {
          setWorkerPodCount(pill, 0);
          for (let k = 0; k < lostPods; k++) {
            zone2Workers.sort((a, b) => getWorkerPodCount(a) - getWorkerPodCount(b));
            setWorkerPodCount(zone2Workers[0], getWorkerPodCount(zone2Workers[0]) + 1, { boosted: true });
          }
        }
      }
      evacuatedRecords.push({ pill, homeBox: pill.parentElement });
    });

    setPrimarySiteDownVisual(true, 'ZONE DOWN');
    primaryClusterBadge.textContent = '⚠ Zone 1 Offline · Workloads Moved to Zone 2';

    const z2Cols = Array.from(secondaryNodesRow.children);
    evacuatedRecords.forEach((rec, idx) => {
      const targetBox = getWorkloadBox(z2Cols[idx % z2Cols.length]);
      setTimeout(() => {
        if (targetBox) {
          flyWorkloadPill(rec.pill, targetBox, true);
          updateContainerLoads(secondaryNodesRow);
        }
      }, idx * 170);
    });

    secondaryClusterSub.textContent = '● Hosting all cluster workloads via synchronous shared storage (0 data loss)';
    renderScenarioControlBar();
    const isSanRa = site1StorageMode === 'san';
    showToast(
      'Zone 1 Offline · Automatic Rack Aware Cluster Failover!',
      isSanRa
        ? 'Because Site 1 & Site 2 share synchronous SAN storage (< 5 ms latency), all Zone 1 VMs & AKS nodes automatically restarted in Zone 2 with zero data loss!'
        : 'Because Site 1 & Site 2 share one synchronous Storage Spaces Direct pool (< 1 ms RDMA), all Zone 1 VMs & AKS nodes automatically restarted in Zone 2 with zero data loss!',
      isSanRa ? 'icons/san-array.svg' : 'icons/azure-local.svg'
    );
  } else {
    site1Offline = false;
    setPrimarySiteDownVisual(false);
    primaryClusterBadge.textContent = '● High Availability Cluster Active';
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
      'Site 1 (Availability Zone 1) rejoined the Rack Aware cluster and rebalanced active workloads.',
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
  const box = getWorkloadBox(col);

  // Download the update package once from Azure via the existing link; subsequent nodes patch directly from the staged package!
  downloadClusterUpdateOnce(() => {
    // Phase 1: Enter Maintenance Mode (DRAINING) & slowly Live-Migrate VMs off
    col.classList.add('updating-node');
    pwrText.textContent = 'DRAINING VMs';
    if (verBadge) verBadge.textContent = 'Maintenance Mode · Live Migrating VMs (0 Downtime)...';
    primaryClusterBadge.textContent = `🔄 CAU Draining ${nodeLabel}: Live-migrating VMs to peer nodes (0 Downtime)...`;

    const pillsToReturn = [];
    const pills = box ? Array.from(box.children) : [];
    const peers = cols.filter((_, idx) => idx !== nodeIdx);

    pills.forEach((pill, i) => {
      const peerCol = peers[(nodeIdx + i) % peers.length];
      const targetBox = getWorkloadBox(peerCol);
      pillsToReturn.push({ pill, homeBox: box });
      const tMig = setTimeout(() => {
        if (targetBox) {
          flyWorkloadPill(pill, targetBox, false, 2100);
          updateContainerLoads(primaryNodesRow);
        }
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
  primaryWorkloadsRow.querySelectorAll('.vm-pill.policy-test-vm').forEach(el => el.remove());

  // Flag 1 Public Cloud VM (Cloud-SQL-VM-01) and 2 On-Premises VMs as Guest OS Baseline Drift
  const cloudSqlCard = document.querySelector('[data-policy-target="cloud-sql-1"]');
  const cloudWebCard = document.querySelector('[data-policy-target="cloud-vm-1"]');
  const cloudAksCard = document.querySelector('[data-policy-target="cloud-aks-1"]');
  if (cloudWebCard) setWorkloadPolicyChip(cloudWebCard, 'compliant', '✓ OS Hardened');
  if (cloudSqlCard) setWorkloadPolicyChip(cloudSqlCard, 'noncompliant', '⚠ TLS 1.0 Enabled');
  if (cloudAksCard) setWorkloadPolicyChip(cloudAksCard, 'compliant', '✓ OS Hardened');

  const pills = Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill'));
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
  Array.from(primaryWorkloadsRow.querySelectorAll('.vm-pill')).forEach(pill => {
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
  const targetBox = getWorkloadBox(cols[0]);
  if (!targetBox) return;

  // Remove any previous test VM pill first
  primaryWorkloadsRow.querySelectorAll('.vm-pill.policy-test-vm').forEach(el => el.remove());

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
// WORKLOAD DEPLOYMENT CHOOSER & ILLUSTRATIVE PLACEMENT
// ============================================================================
const DEPLOYMENT_OPTIONS = [
  { id: 'vm', title: 'Virtual Machine', icon: 'icons/vm.svg' },
  { id: 'confidential-vm', title: 'Confidential VM', icon: 'icons/key-vault.svg' },
  { id: 'aks-node', title: 'AKS worker node', icon: 'icons/aks.svg' },
  { id: 'aks-pods', title: 'AKS application pods', icon: 'icons/aks.svg' },
  { id: 'avd-host', title: 'AVD session host', icon: 'icons/avd.svg' }
];

let deploymentReturnFocus = null;

function getDeploymentTargets() {
  let rows = [primaryNodesRow];
  if (scenario === 'rack-aware' || (scenario === 'hvreplica' && site1Offline)) {
    rows = [secondaryNodesRow];
    if (scenario === 'rack-aware') rows.unshift(primaryNodesRow);
  }
  return rows.flatMap(row => Array.from(row.querySelectorAll('.node-column:not(.offline)')).map(column => ({
    column,
    box: getWorkloadBox(column)
  })).filter(item => Boolean(item.box)));
}

function getDeploymentAvailability(type) {
  if (mode === 'connected' && cableCut) {
    return { available: false, reason: 'The simulated Azure connection is interrupted. Restore the link before starting a new deployment.' };
  }

  if (type === 'vm') {
    return {
      available: true,
      reason: mode === 'disconnected'
        ? 'Disconnected VM deployment requires a locally prepared image and supported local networking; this simulation does not validate them.'
        : 'Illustrative VM placement; image, network, and capacity checks are not performed.'
    };
  }

  if (type === 'confidential-vm') {
    if (mode === 'disconnected') {
      return { available: false, reason: 'The documented Azure Local CVM attestation and secure key-release flow requires Azure connectivity.' };
    }
    if (scenario !== 'default' && scenario !== 'confidential-computing') {
      return { available: false, reason: 'Return to Single-Site Overview to deploy a CVM, or use the Confidential Computing scenario.' };
    }
    if (scenario === 'confidential-computing' && primaryWorkloadsRow?.querySelector('.vm-pill.confidential-vm')) {
      return { available: false, reason: 'The scenario already has a CVM; use its guided steps to continue.' };
    }
    return { available: true, reason: 'Assumes validated CVM-capable AMD SEV-SNP hardware and a prepared integrity-protected image.' };
  }

  if (type === 'aks-node' || type === 'aks-pods') {
    if (scenario !== 'default') {
      return { available: false, reason: 'AKS scale-out is modelled on the Single-Site Overview stage only.' };
    }
    if (type === 'aks-pods' && !primaryWorkloadsRow?.querySelector('.vm-pill.aks[data-workload-kind="aks-node"]')) {
      return { available: false, reason: 'Deploy an AKS worker node first.' };
    }
    return {
      available: true,
      reason: type === 'aks-node'
        ? 'Represents scaling the existing cluster. AKS availability sets use weak anti-affinity to distribute worker VMs across physical hosts.'
        : 'Assumes a healthy existing AKS cluster and locally available images. Pod scheduling depends on capacity and declared topology constraints.'
    };
  }

  if (type === 'avd-host') {
    if (mode === 'disconnected') {
      return { available: false, reason: 'AVD session hosts run locally, but the AVD brokering service requires a connection to Azure.' };
    }
    if (scenario !== 'default') {
      return { available: false, reason: 'AVD session-host deployment is modelled on the Single-Site Overview stage only.' };
    }
    return { available: true, reason: 'The local VM is illustrative; host pool, workspace, identity, network, and licensing setup are not configured.' };
  }

  return { available: false, reason: 'This workload type is not available in the current simulation.' };
}

function renderDeploymentOptions() {
  if (!deployOptionGrid) return;
  deployOptionGrid.innerHTML = DEPLOYMENT_OPTIONS.map(option => {
    const availability = getDeploymentAvailability(option.id);
    return `
      <button type="button" class="deployment-option" data-deployment-type="${option.id}" ${availability.available ? '' : 'aria-disabled="true"'} title="${availability.reason}" aria-label="${option.title}${availability.available ? '' : `, unavailable. ${availability.reason}`}"><img src="${option.icon}" alt="" /><span>${option.title}</span></button>
    `;
  }).join('');

  deployOptionGrid.querySelectorAll('[data-deployment-type]').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.deploymentType;
      const availability = getDeploymentAvailability(type);
      if (!availability.available) {
        showToast('Workload Unavailable', availability.reason, 'icons/azure-arc.svg');
      } else if (type === 'aks-pods') {
        aksPodReplicaControls.hidden = false;
        positionDeployChooser();
        aksPodReplicaCount.focus();
      } else {
        closeDeployChooser();
        deploySimulatedWorkload(type);
      }
    });
  });
}

function positionDeployChooser() {
  if (!deploymentReturnFocus || deployChooser.hidden) return;
  const anchor = deploymentReturnFocus.getBoundingClientRect();
  const menu = deployChooser.getBoundingClientRect();
  const gap = 6;
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - menu.width - 8));
  const top = anchor.bottom + gap + menu.height <= window.innerHeight
    ? anchor.bottom + gap
    : Math.max(8, anchor.top - menu.height - gap);
  deployChooser.style.left = `${left}px`;
  deployChooser.style.top = `${top}px`;
}

function openDeployChooser(event) {
  event?.stopPropagation();
  if (!deployChooser) return;
  if (!deployChooser.hidden && deploymentReturnFocus === event.currentTarget) {
    closeDeployChooser();
    return;
  }
  closeDeployChooser(false);
  deploymentReturnFocus = event?.currentTarget || document.activeElement;
  aksPodReplicaControls.hidden = true;
  renderDeploymentOptions();
  deployChooser.hidden = false;
  deploymentReturnFocus.setAttribute('aria-expanded', 'true');
  positionDeployChooser();
  deployOptionGrid.querySelector('button')?.focus();
}

function closeDeployChooser(restoreFocus = true) {
  if (!deployChooser || deployChooser.hidden) return;
  deployChooser.hidden = true;
  deploymentReturnFocus?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) deploymentReturnFocus?.focus();
  deploymentReturnFocus = null;
}

function focusAfterWorkloadRemoval(button, item) {
  if (document.activeElement !== button) return;
  const siblings = Array.from(item.parentElement.children);
  const index = siblings.indexOf(item);
  const nearby = [...siblings.slice(index + 1), ...siblings.slice(0, index).reverse()]
    .map(sibling => sibling.querySelector(':scope > .workload-remove'))
    .find(Boolean);
  const worker = item.closest('.vm-pill');
  const workerButton = worker !== item ? worker?.querySelector(':scope > .workload-remove') : null;
  const deployButton = scenario === 'rack-aware' ? btnAddVmRack : btnAddVm;
  (nearby || workerButton || deployButton)?.focus({ preventScroll: true });
}

function removeSimulatedWorkload(workload, button) {
  const podCount = workload.dataset.workloadKind === 'aks-node' ? getWorkerPodCount(workload) : 0;
  if (podCount > 0) {
    const workers = getDeploymentTargets()
      .flatMap(item => Array.from(item.box.querySelectorAll('.vm-pill.aks[data-workload-kind="aks-node"]')))
      .filter(worker => worker !== workload);
    if (!workers.length) {
      showToast('Cannot Remove AKS Worker', 'Bring another AKS worker online before removing this worker node.', 'icons/aks.svg');
      return;
    }
    for (let k = 0; k < podCount; k++) {
      workers.sort((a, b) => getWorkerPodCount(a) - getWorkerPodCount(b));
      setWorkerPodCount(workers[0], getWorkerPodCount(workers[0]) + 1, { boosted: true });
    }
  }

  const name = workload.dataset.vmName;
  const isConfidential = workload.dataset.workloadKind === 'confidential-vm';
  focusAfterWorkloadRemoval(button, workload);
  workload.remove();
  evacuatedRecords = evacuatedRecords.filter(record => record.pill !== workload);

  if (scenario === 'hvreplica' && hvReplicationOn && !site1Offline) {
    secondaryWorkloadsRow?.querySelectorAll('.ghost-replica-pill').forEach(ghost => {
      if (ghost.dataset.vmName === name) ghost.remove();
    });
  }
  if (scenario === 'confidential-computing' && isConfidential) {
    stopDemoAutoPlay();
    confidentialRunId += 1;
    confidentialBusy = false;
    confidentialStep = 0;
    body.classList.remove('cvm-attested', 'cvm-key-released', 'cvm-policy-denied');
    cvmAttestationStatus.textContent = 'Waiting for confidential VM evidence';
    cvmAttestationBadge.textContent = 'Attestation service';
    renderScenarioControlBar();
  }

  updateContainerLoads(primaryNodesRow);
  updateContainerLoads(secondaryNodesRow);
  const podMessage = podCount > 0 ? ` ${podCount} ${podCount === 1 ? 'pod was' : 'pods were'} redistributed to other workers.` : '';
  showToast('Workload Removed', `${name} was removed from this browser simulation.${podMessage}`, 'icons/azure-local.svg');
}

function createAksPod(workerPill) {
  if (!workerPill) return;
  deploymentPodCount += 1;
  setWorkerPodCount(workerPill, getWorkerPodCount(workerPill) + 1, { boosted: true });
}

function nextWorkloadName(type) {
  const prefixes = {
    vm: 'App-VM',
    'confidential-vm': 'Confidential-VM',
    'aks-node': 'AKS-Node',
    'avd-host': 'AVD-Session-Host'
  };
  const prefix = `${prefixes[type]}-`;
  const highest = Math.max(0, ...Array.from(document.querySelectorAll('.vm-pill[data-vm-name]'))
    .map(pill => pill.dataset.vmName)
    .filter(name => name.startsWith(prefix))
    .map(name => Number(name.slice(prefix.length)) || 0));
  return `${prefix}${String(highest + 1).padStart(2, '0')}`;
}

function deploySimulatedWorkload(type, replicaCount = 6, onComplete = null) {
  const availability = getDeploymentAvailability(type);
  if (!availability.available) {
    showToast('Workload Unavailable', availability.reason, 'icons/azure-arc.svg');
    return false;
  }

  const targets = getDeploymentTargets();
  if (!targets.length) {
    showToast('No Online Host Available', 'Bring a physical host online before placing a workload.', 'icons/azure-local.svg');
    return false;
  }

  let target;
  if (type === 'aks-pods') {
    const workerPills = targets.flatMap(item => Array.from(item.box.querySelectorAll('.vm-pill.aks[data-workload-kind="aks-node"]')));
    if (!workerPills.length) {
      showToast('No AKS Worker Available', 'Deploy an AKS worker node before adding application pods.', 'icons/aks.svg');
      return false;
    }
    target = workerPills[0];
  } else {
    targets.sort((a, b) => a.box.querySelectorAll(':scope > .vm-pill').length - b.box.querySelectorAll(':scope > .vm-pill').length);
    target = targets[0].box;
  }

  const from = (mode === 'disconnected' && mgmtClusterBox && mgmtClusterBox.getBoundingClientRect().height > 60)
    ? getMgmtConduitOrigin()
    : getCloudConduitOrigin();
  const to = relCenter(target);
  const color = mode === 'connected' ? '#38bdf8' : '#fbbf24';
  const runId = deploymentRunId;
  const launchScenario = scenario;
  const launchMode = mode;

  commandBursts.push({
    sx: from.x,
    sy: from.y,
    tx: to.x,
    ty: to.y,
    t: 0,
    color,
    onArrive: () => {
      if (runId !== deploymentRunId || launchScenario !== scenario || launchMode !== mode) {
        showToast('Deployment Canceled', 'The mode or scenario changed before placement completed, so no workload was added.', 'icons/azure-arc.svg');
        return;
      }
      let destinationHost = getHostColumnFromElement(target);
      if (type === 'aks-pods') {
        const workers = getDeploymentTargets().flatMap(item => Array.from(item.box.querySelectorAll('.vm-pill.aks[data-workload-kind="aks-node"]')));
        if (!workers.length) {
          showToast('No AKS Worker Available', 'Bring an AKS worker online before adding application pods.', 'icons/aks.svg');
          return;
        }
        const count = Math.max(1, Math.min(24, Number(replicaCount) || 6));
        for (let index = 0; index < count; index++) {
          workers.sort((a, b) => getWorkerPodCount(a) - getWorkerPodCount(b));
          createAksPod(workers[0]);
        }
        showToast(
          `${count} AKS Pods Scheduled`,
          `The illustrative scheduler balanced replicas across ${workers.length} eligible worker nodes (placement skew at most one). Real Kubernetes placement depends on capacity and topology-spread constraints.`,
          'icons/aks.svg'
        );
      } else {
        const hostTargets = getDeploymentTargets();
        if (!hostTargets.length) {
          showToast('No Online Host Available', 'Bring a physical host online before placing a workload.', 'icons/azure-local.svg');
          if (onComplete) onComplete(null);
          return;
        }
        const name = nextWorkloadName(type);
        const workload = createVmPillElement({
          name,
          icon: type === 'aks-node' ? 'icons/aks.svg' : (type === 'avd-host' ? 'icons/avd.svg' : 'icons/vm.svg'),
          cls: type === 'aks-node' ? 'aks' : '',
          kind: type,
          extraClass: type === 'confidential-vm' ? 'confidential-vm' : '',
          replicable: type === 'vm',
          initialPods: 0,
          removable: true
        });
        workload.style.animation = 'spawnPop 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        hostTargets.sort((a, b) => a.box.querySelectorAll(':scope > .vm-pill').length - b.box.querySelectorAll(':scope > .vm-pill').length);
        const destination = hostTargets.find(item => item.column === destinationHost) || hostTargets[0];
        destination.box.appendChild(workload);
        destinationHost = destination.column;
        if (type === 'confidential-vm') workload.classList.add('cvm-key-waiting');
        showToast(
          `${DEPLOYMENT_OPTIONS.find(option => option.id === type)?.title} Deployed`,
          `${name} was added to ${destinationHost.querySelector('.node-id-label')?.textContent || 'an online host'} in this browser simulation. No Azure resource was created.`,
          type === 'aks-node' ? 'icons/aks.svg' : 'icons/vm.svg'
        );
      }

      updateContainerLoads(primaryNodesRow);
      updateContainerLoads(secondaryNodesRow);
      if (scenario === 'hvreplica' && hvReplicationOn && !site1Offline) renderHvSite2StandbyState();
      if (onComplete) onComplete(destinationHost);
    }
  });
  return true;
}

function triggerDeployLocalVm(event) {
  openDeployChooser(event);
}

btnAddVm?.addEventListener('click', triggerDeployLocalVm);
btnAddVmRack?.addEventListener('click', triggerDeployLocalVm);
document.addEventListener('click', event => {
  if (!deployChooser.hidden && !deployChooser.contains(event.target) && event.target !== deploymentReturnFocus) closeDeployChooser(false);
});
document.addEventListener('focusin', event => {
  if (!deployChooser.hidden && !deployChooser.contains(event.target) && event.target !== deploymentReturnFocus) closeDeployChooser(false);
});
window.addEventListener('resize', positionDeployChooser);
window.addEventListener('scroll', positionDeployChooser, true);
btnConfirmDeploy?.addEventListener('click', () => {
  const count = Number(aksPodReplicaCount.value);
  closeDeployChooser();
  deploySimulatedWorkload('aks-pods', count);
});

function finishConfidentialStep(runId, step) {
  if (runId !== confidentialRunId || scenario !== 'confidential-computing') return;
  confidentialBusy = false;
  confidentialStep = step;
  renderScenarioControlBar();
}

function runConfidentialFlow(fromElement, toElement, color, runId, onArrive) {
  if (!fromElement || !toElement) {
    confidentialBusy = false;
    renderScenarioControlBar();
    showToast('Confidential VM Demo Unavailable', 'The required visual service or workload is not available on the stage.', 'icons/key-vault.svg');
    return;
  }
  const from = relCenter(fromElement);
  const to = relCenter(toElement);
  commandBursts.push({
    sx: from.x,
    sy: from.y,
    tx: to.x,
    ty: to.y,
    t: 0,
    speed: 0.018,
    color,
    onArrive: () => {
      if (runId !== confidentialRunId || scenario !== 'confidential-computing') return;
      onArrive();
    }
  });
}

function advanceConfidentialStep() {
  if (confidentialBusy) return;
  if (confidentialStep >= 4) {
    selectScenario('confidential-computing');
    return;
  }

  const runId = confidentialRunId;
  const cvm = primaryWorkloadsRow?.querySelector('.vm-pill.confidential-vm');
  const attestation = document.getElementById('cvmAttestationService');
  const keyVault = document.getElementById('cloudKeyVaultOrb');

  if (confidentialStep === 0) {
    confidentialBusy = true;
    renderScenarioControlBar();
    const accepted = deploySimulatedWorkload('confidential-vm', 0, () => {
      const deployedCvm = primaryWorkloadsRow?.querySelector('.vm-pill.confidential-vm');
      if (!deployedCvm) {
        confidentialBusy = false;
        renderScenarioControlBar();
        return;
      }
      deployedCvm.classList.add('cvm-key-waiting');
      if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'CVM deployed locally · waiting for hardware evidence';
      finishConfidentialStep(runId, 1);
    });
    if (!accepted) {
      confidentialBusy = false;
      renderScenarioControlBar();
    }
    return;
  }

  confidentialBusy = true;
  renderScenarioControlBar();
  if (confidentialStep === 1) {
    if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Verifying AMD SEV-SNP hardware evidence';
    if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Verifying evidence';
    runConfidentialFlow(cvm, attestation, '#a78bfa', runId, () => {
      runConfidentialFlow(attestation, cvm, '#38bdf8', runId, () => {
        body.classList.add('cvm-attested');
        if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Hardware-backed attestation verified · signed token returned';
        if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Attested';
        cvm?.classList.remove('cvm-key-waiting');
        finishConfidentialStep(runId, 2);
        showToast(
          'Confidential Platform Attested',
          'Microsoft Azure Attestation verified the hardware-rooted evidence and returned an attestation token. The workload data itself stays on-premises.',
          'icons/defender.svg'
        );
      });
    });
    return;
  }

  if (confidentialStep === 2) {
    if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Azure Local cluster identity requests a policy-protected key';
    if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Evidence verified';
    runConfidentialFlow(datacenterBox, keyVault, '#a78bfa', runId, () => {
      runConfidentialFlow(keyVault, cvm, '#34d399', runId, () => {
        body.classList.add('cvm-key-released');
        if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Key Vault released the key after validating the attestation policy';
        if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Key released';
        cvm?.classList.remove('cvm-key-waiting');
        finishConfidentialStep(runId, 3);
        showToast(
          'Secure Key Release Approved',
          'The Azure Local host-side SDK used the cluster identity to request key release. Key Vault accepted the attestation token and the workload can process data in protected memory.',
          'icons/key-vault.svg'
        );
      });
    });
    return;
  }

  if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Submitting evidence that does not satisfy the key-release policy';
  if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Claim not authorized';
  runConfidentialFlow(cvm, attestation, '#fb7185', runId, () => {
    runConfidentialFlow(attestation, keyVault, '#fb7185', runId, () => {
      body.classList.add('cvm-policy-denied');
      if (cvmAttestationStatus) cvmAttestationStatus.textContent = 'Key Vault denied release · workload cannot access the protected key';
      if (cvmAttestationBadge) cvmAttestationBadge.textContent = 'Release denied';
      finishConfidentialStep(runId, 4);
      showToast(
        'Key Release Denied',
        'The attestation evidence did not satisfy the Key Vault release policy. The VM can remain running, but its sensitive workload cannot access the key.',
        'icons/key-vault.svg'
      );
    });
  });
}

function scheduleConfidentialSteps(delays) {
  delays.forEach((delay, index) => {
    const timer = setTimeout(() => {
      if (!demoAutoPlayActive || scenario !== 'confidential-computing') return;
      advanceConfidentialStep();
      if (index === delays.length - 1) {
        const finishTimer = setTimeout(() => {
          demoAutoPlayActive = false;
          renderScenarioControlBar();
        }, 2200);
        demoAutoPlayTimers.push(finishTimer);
      }
    }, delay);
    demoAutoPlayTimers.push(timer);
  });
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
const visualStageResizeObserver = new ResizeObserver(resizeCanvas);
visualStageResizeObserver.observe(visualStage);

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
    if (!site1Offline) {
      spawnCloudArcStreamParticle(arcBridgeBadge, isLight);
    }
    if (isTwoSiteScenario() && arcBridgeBadge2 && arcBridgeBadge2.getBoundingClientRect().width > 30 && Math.random() < 0.55) {
      spawnCloudArcStreamParticle(arcBridgeBadge2, isLight);
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

  // 2. Cloud DR Continuous Replication Stream (Site 1 -> Azure Storage)
  if (!cableCut && scenario === 'asr' && !site1Offline) {
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

  // 3. 2nd Site DR Stream (One-way VM replication Site 1 -> Site B via Hyper-V Replica or ASR Preview)
  if (scenario === 'hvreplica' && hvReplicationOn && !site1Offline) {
    const stageRect = visualStage.getBoundingClientRect();
    const pRect = datacenterBox.getBoundingClientRect();
    const sRect = secondarySiteBox.getBoundingClientRect();
    if (sRect.width > 80 && sRect.left > pRect.left + 100) {
      const midY = (Math.max(pRect.top, sRect.top) + Math.min(pRect.bottom, sRect.bottom)) / 2 - stageRect.top;
      const isAsr = isTwoSiteAsrActive();
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
        color: isAsr
          ? (isLight ? '#7c3aed' : '#c084fc')
          : (isLight ? '#059669' : '#34d399')
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
    drawControlPlaneGuide(origin, arcBridgeBadge, site1Offline, false);
    if (isTwoSiteScenario() && arcBridgeBadge2 && arcBridgeBadge2.getBoundingClientRect().width > 30) {
      drawControlPlaneGuide(origin, arcBridgeBadge2, false, false);
    }
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

  // Dedicated Cloud DR Upward VM Replication Conduit across the Skyway Gap (Site 1 -> Azure Storage)
  if (!cableCut && scenario === 'asr') {
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

      // Upward Arrowhead at the top (entering Azure) + Midpoint directional chevron
      drawVerticalArrowhead(ctx, laneX, yTop + 2, -1, lineColor);
      if (!site1Offline && yBottom - yTop > 55) {
        drawVerticalArrowhead(ctx, laneX, midY + 14, -1, lineColor);
      }

      // Pill Badge next to the upward conduit indicating replication direction to Azure
      ctx.save();
      const tagText = site1Offline ? 'FAILOVER ACTIVE IN AZURE' : '↑ VM REPLICATION TO AZURE';
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
        // 2nd Site DR: Single One-Way Site-to-Site VM Replication Line (Site 1 -> Site B via Hyper-V Replica or ASR Preview)
        const isAsr = isTwoSiteAsrActive();
        const activeColor = isAsr ? 'rgba(168, 85, 247, 0.72)' : 'rgba(16, 185, 129, 0.65)';
        const lineColor = hvReplicationOn
          ? (site1Offline ? 'rgba(244, 63, 94, 0.35)' : activeColor)
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
        const tagText = hvReplicationOn ? (isAsr ? 'ASR' : 'ASYNC') : 'IDLE';
        ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
        const tw = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, midY - 20, tw, 16, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hvReplicationOn
          ? (isAsr ? (isLight ? '#6d28d9' : '#d8b4fe') : (isLight ? '#047857' : '#6ee7b7'))
          : '#94a3b8';
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
