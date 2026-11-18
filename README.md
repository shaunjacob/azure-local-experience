<p align="center">
  <img src="icons/azure-local.svg" width="72" alt="Azure Local" />
</p>

<h1 align="center">Azure Local Experience</h1>

<p align="center">
  Explore hybrid cloud, disconnected operations, and resiliency through an interactive architecture demo.
</p>

<p align="center">
  <a href="https://shaunjacob.github.io/azure-local-experience/"><strong>Launch the interactive experience</strong></a>
  &nbsp; | &nbsp;
  <a href="#scenario-guide">Scenario guide</a>
  &nbsp; | &nbsp;
  <a href="#run-locally">Run locally</a>
</p>

[![Connected architecture: Azure management services above a four-node local workload cluster](docs/images/connected-overview.png)](https://shaunjacob.github.io/azure-local-experience/)

## See the architecture. Change the scenario.

Azure Local Experience turns architecture conversations into a hands-on,
browser-based walkthrough. Switch between cloud-connected and disconnected
management, introduce failures, and follow how the illustrated workloads,
storage, and control plane respond.

Built for architecture discussions, learning sessions, and live demonstrations.
No Azure subscription, account sign-in, backend, or build step is required.

> **An educational simulation, not a deployment tool.** Workloads, utilization,
> failures, and recovery are simulated in your browser. The diagrams and timing
> labels are illustrative, not a support matrix, SLA, or production sizing
> guidance. Validate real deployments against current
> [Azure Local documentation](https://learn.microsoft.com/azure/azure-local/).

## Two ways to explore

| Connected architecture | Disconnected architecture |
| --- | --- |
| Explore local workloads with Azure-hosted management and Azure Arc in the diagram. | See management move into a dedicated local three-node management cluster, alongside local identity services. |
| Compare local operations with cloud-based governance and recovery scenarios. | Explore the visual distinction between an internet outage and a deliberately disconnected design. |

In the disconnected view, customer-provided AD DS, AD FS, DNS, and PKI are
shown separately from the appliance-hosted STS and Graph endpoints. The current
identity integration uses AD DS and AD FS; broader identity-provider choices
are planned for 2704. The diagram calls its monitoring service **Local
Monitoring** to distinguish it from Azure Monitor. Foundry Local is shown in
both modes; disconnected deployment uses locally imported dependencies and
model artifacts with local identity.

### Disconnected management, in view

![Disconnected-mode screenshot showing local management, identity services, and a separate workload cluster](docs/images/disconnected-overview.png)

### Two sites, one recovery story

![Second-site disaster recovery across two Azure Local sites with Hyper-V Replica and the SAN-backed ASR preview option](docs/images/second-site-replication.png)

## Scenario guide

Choose **Scenarios** in the top-right corner. Where available, use **Next** to
step through a scenario or **Play All** for a guided sequence.
An orange pulse highlights the menu on each page load until you first open it;
switching scenarios does not restart the pulse. With reduced motion enabled,
the menu uses a static orange highlight instead.

| Scenario | What you can explore |
| --- | --- |
| Single-Site Overview | A four-node cluster, illustrated local workloads, VM placement, and S2D/SAN storage choices. |
| Internet Outage | Interrupt the illustrated WAN connection and compare local workloads with cloud management availability. |
| Node Failure (HA) | Click a server to simulate failure and watch workload recovery on remaining nodes. |
| Cloud DR (Site Recovery) | Walk through illustrated replication, failover to Azure, and failback using Azure Site Recovery. |
| 2nd Site DR | Replicate across two Azure Local sites with Hyper-V Replica (default with S2D) or select ASR (SAN Only) Preview to switch both sites to SAN for Azure-orchestrated site-to-site recovery. |
| Rack Aware Cluster | Explore a cluster spanning two zones, storage choices, and zone failure recovery. |
| Update Manager | Follow a rolling update sequence with workload migration, patching, and node reboots. |
| Unified Azure Policy | Walk through simulated guest OS auditing, remediation, and configuration drift. |
| Confidential Computing | Follow an Azure Local confidential VM through hardware-backed attestation, policy-gated key release, and a denied claim. This connected-only walkthrough assumes supported hardware and a prepared image. |

Internet Outage, Cloud DR, and Update Manager are connected-only scenarios in
this demo. Choosing one from disconnected mode switches the experience back to
connected mode.

## Try a five-minute walkthrough

1. Launch the experience and explore **Single-Site Overview**. Click diagram
   components for explanations, open **Deploy** to choose an illustrated
   workload, and compare storage options. Select a workload to deploy it;
   AKS pods also let you choose a replica count. Use the small × on a deployed
   workload or pod to remove it from the simulation. Unavailable options are
   dimmed; select one to see why it is unavailable.
2. Switch to **Disconnected Mode** to see how the management layout changes.
3. Choose **Node Failure (HA)** and click a server to simulate an outage.
4. Choose **2nd Site DR** to step through site-to-site replication, failover to
   Site B, and failback to Site 1 using **Hyper-V Replica** with S2D selected by
   default, or select **ASR (SAN Only) Preview** (in Connected Mode) to
   automatically switch both Site 1 and Site B storage to **SAN** for
   Azure-orchestrated site-to-site recovery.
5. Try **Update Manager**, **Unified Azure Policy**, or **Confidential
   Computing**. The Deploy chooser distinguishes locally running workloads
   from cloud-dependent services such as AVD and confidential-VM key release.

The workload chooser and confidential-computing walkthrough are browser
simulations, not provisioning tools. Availability guidance follows Microsoft
documentation for [Azure Local disconnected operations](https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-overview?view=azloc-2610),
[confidential VMs](https://learn.microsoft.com/azure/azure-local/manage/confidential-vm-overview?view=azloc-2610),
[AKS on Azure Local disconnected operations](https://learn.microsoft.com/azure/aks-hybrid-edge/local/disconnected-operations/overview),
and [Azure Virtual Desktop on Azure Local](https://learn.microsoft.com/azure/virtual-desktop/azure-local-overview#limitations).
The illustrative pod scheduler balances selected replicas across the shown AKS
workers, including redistributing pods when a deployed worker is removed; actual
Kubernetes placement depends on cluster capacity and scheduling constraints.

In **2nd Site DR**, replication and failover stay between the two Azure Local
sites rather than failing over into Azure (which is covered separately by
**Cloud DR** using [Azure Local-to-Azure ASR](https://techcommunity.microsoft.com/blog/AzureStackBlog/azure-site-recovery-for-azure-local-is-now-generally-available/4529925)).
When Storage Spaces Direct (S2D) exists on either or both sites, the scenario
uses [Hyper-V Replica between Azure Local clusters](https://learn.microsoft.com/azure/azure-local/manage/disaster-recovery-vm-resiliency?view=azloc-2610#use-hyper-v-replica-for-continuous-replication-of-business-critical-vms)
(which also works in disconnected mode when network connectivity exists between
the sites). Selecting **ASR (SAN Only) Preview** in connected mode switches
both Site 1 and Site B to external **SAN** storage to illustrate
Azure Site Recovery for Azure Local-to-Azure Local site-to-site protection.

## Run locally

Clone or download this repository, then open the root `index.html` in a modern
browser. Keep `app.js`, `styles.css`, and `icons/` alongside it.

On phones and tablets, cloud service cards reflow, management and workload
clusters stack vertically, and scenario controls stay in the page flow. On
phones, the Scenarios menu opens as a scrollable bottom sheet. Narrow phones
show one workload node per row; larger phones and tablets show up to two.

```text
index.html       Application entry point
app.js           Scenario logic, interactions, and animation
styles.css       Layout, themes, and visual styling
icons/           SVG service and infrastructure icons
docs/images/     Actual application screenshots used in this README
```

The app uses plain HTML, CSS, JavaScript, and a canvas animation layer. Google
Fonts is requested when available; the stylesheet also defines fallback fonts.

## Hosting with GitHub Pages

**Live site:** https://shaunjacob.github.io/azure-local-experience/

This repository publishes directly from **`main` / `/ (root)`**. GitHub Pages
serves `index.html` as the entry point, with the adjacent JavaScript, CSS, and
icons. It does not serve this README as the application homepage.

To reproduce the setup in a fork:

1. Open **Settings > Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/ (root)**, then click **Save**.
4. Wait for the **pages build and deployment** run to complete, then use the
   site link shown in Pages settings.

Future pushes to `main` publish automatically. No custom deployment workflow,
cross-repository token, or Azure hosting resource is needed for Pages. If a
change does not appear, check the Pages deployment run and refresh your browser.
GitHub Pages publishes a public website; do not include secrets in site files.

<details>
<summary>Optional: cross-repository index.html sync (separate from Pages)</summary>

The existing `Sync index.html` workflow is independent of website hosting.
It runs on pushes to `main`, or manually, and copies only the root `index.html`
to `Azure/azure-local-experience` on `main`. It creates a destination commit only
when that file differs; it does not copy `app.js`, `styles.css`, or `icons/`.
The destination must maintain compatible assets separately.

It requires the source repository's `DESTINATION_REPO_TOKEN` Actions secret:
a fine-grained personal access token with resource owner `Azure`, access limited
to `azure-local-experience`, and **Contents: Read and write** permission. Its
owner must have destination write access and any required organization approval.
Add it under **Settings > Secrets and variables > Actions**. Destination rules
must allow the owner's direct pushes; rotate the secret before its token expires.

Without that secret the sync workflow fails explicitly, but Pages deployment
is separate and does not depend on it.

</details>
