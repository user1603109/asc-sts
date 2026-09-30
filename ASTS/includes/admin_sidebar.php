<?php
// Get the current file name (e.g., 'dashboard.php', 'enlistment.php')
$current_page = basename($_SERVER['PHP_SELF']);
?>

<style>
    /* Sidebar Base Styling */
    .admin-sidebar {
        background-color: #011F5B; /* Penn Blue */
        height: 100vh; /* Fixed height for sticky behavior */
        width: 280px;
        color: #FFFFFF;
        transition: all 0.3s ease;
        z-index: 1000;
        position: sticky;
        top: 0;
        overflow: hidden;
    }

    /* Minimized Sidebar State */
    .admin-sidebar.minimized {
        width: 80px;
    }
    
    .admin-sidebar.minimized .brand-text-container,
    .admin-sidebar.minimized .nav-text {
        display: none;
    }
    
    .admin-sidebar.minimized .sidebar-brand {
        padding: 1.5rem 0 !important;
        justify-content: center !important;
    }
    
    .admin-sidebar.minimized #sidebarToggle {
        margin: 0 auto;
    }
    
    .admin-sidebar.minimized .sidebar-icon {
        margin-right: 0;
        font-size: 1.5rem;
    }
    
    .admin-sidebar.minimized .nav-link {
        justify-content: center;
        padding: 1rem 0;
    }

    /* Adjust main content width dynamically when minimized */
    body.sidebar-collapsed .main-content {
        width: calc(100% - 80px) !important;
    }

    /* Branding Area (Static) */
    .sidebar-brand {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }
    .sidebar-brand-text {
        color: #FFBF00; /* Amber Gold */
        letter-spacing: 1px;
    }

    /* Toggle Button */
    #sidebarToggle {
        color: #FFFFFF;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: color 0.2s ease;
    }
    #sidebarToggle:hover {
        color: #FFBF00;
    }

    /* Scrollable Navigation Area */
    .sidebar-scrollable {
        flex-grow: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }

    /* Webkit Custom Scrollbar */
    .sidebar-scrollable::-webkit-scrollbar {
        width: 6px;
    }
    .sidebar-scrollable::-webkit-scrollbar-track {
        background: transparent;
    }
    .sidebar-scrollable::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
    }
    .sidebar-scrollable::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.3);
    }

    /* Navigation Links */
    .sidebar-nav-item {
        margin-bottom: 2px;
    }
    
    .nav-link.sidebar-link {
        color: rgba(255, 255, 255, 0.85);
        padding: 0.85rem 1.5rem;
        border-radius: 0;
        border-left: 4px solid transparent;
        transition: all 0.2s ease-in-out;
        font-weight: 500;
        display: flex;
        align-items: center;
        white-space: nowrap;
    }

    /* Hover & Active States */
    .nav-link.sidebar-link:hover, 
    .nav-link.sidebar-link.active {
        color: #FFFFFF;
        background-color: rgba(255, 191, 0, 0.08);
        border-left: 4px solid #FFBF00;
    }

    /* Icon Spacing */
    .sidebar-icon {
        margin-right: 12px;
        font-size: 1.15rem;
        width: 24px;
        text-align: center;
        transition: all 0.3s ease;
    }
</style>

<div class="admin-sidebar d-flex flex-column flex-shrink-0 shadow">
    
    <!-- STATIC HEADER WITH TOGGLE -->
    <div class="sidebar-brand p-4 d-flex justify-content-between align-items-center">
        <div class="brand-text-container text-start">
            <h3 class="fw-bolder mb-0 text-white">ASTS</h3>
            <span class="sidebar-brand-text small fw-bold text-uppercase">Admin Portal</span>
        </div>
        <button id="sidebarToggle" title="Toggle Sidebar">
            <i class="bi bi-list fs-4"></i>
        </button>
    </div>
    
    <!-- SCROLLABLE MENU CONTENT -->
    <div class="sidebar-scrollable w-100 py-3">
        <ul class="nav flex-column w-100">
            
            <li class="sidebar-nav-item">
                <a href="dashboard.php" class="nav-link sidebar-link <?= ($current_page == 'dashboard.php') ? 'active' : '' ?>">
                    <i class="bi bi-speedometer2 sidebar-icon"></i> <span class="nav-text">Dashboard</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="enlistment.php" class="nav-link sidebar-link <?= ($current_page == 'enlistment.php') ? 'active' : '' ?>">
                    <i class="bi bi-card-checklist sidebar-icon"></i> <span class="nav-text">Enlistment</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="judges.php" class="nav-link sidebar-link <?= ($current_page == 'judges.php') ? 'active' : '' ?>">
                    <i class="bi bi-person-badge sidebar-icon"></i> <span class="nav-text">Judges</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="criteria.php" class="nav-link sidebar-link <?= ($current_page == 'criteria.php') ? 'active' : '' ?>">
                    <i class="bi bi-ui-checks sidebar-icon"></i> <span class="nav-text">Criteria</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="scores.php" class="nav-link sidebar-link <?= ($current_page == 'scores.php') ? 'active' : '' ?>">
                    <i class="bi bi-clipboard-data sidebar-icon"></i> <span class="nav-text">Scores</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="rankings.php" class="nav-link sidebar-link <?= ($current_page == 'rankings.php') ? 'active' : '' ?>">
                    <i class="bi bi-trophy sidebar-icon"></i> <span class="nav-text">Rankings</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="reports.php" class="nav-link sidebar-link <?= ($current_page == 'reports.php') ? 'active' : '' ?>">
                    <i class="bi bi-file-earmark-bar-graph sidebar-icon"></i> <span class="nav-text">Reports</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a href="logs.php" class="nav-link sidebar-link <?= ($current_page == 'logs.php') ? 'active' : '' ?>">
                    <i class="bi bi-journal-text sidebar-icon"></i> <span class="nav-text">System Logs</span>
                </a>
            </li>
            
            <li class="sidebar-nav-item mt-4 border-top border-secondary pt-2">
                <a href="settings.php" class="nav-link sidebar-link <?= ($current_page == 'settings.php') ? 'active' : '' ?>">
                    <i class="bi bi-gear sidebar-icon"></i> <span class="nav-text">Settings</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="backups.php" class="nav-link sidebar-link <?= ($current_page == 'backups.php') ? 'active' : '' ?>">
                    <i class="bi bi-database-down sidebar-icon"></i> <span class="nav-text">Database Backups</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="populate_sample_data.php" class="nav-link sidebar-link <?= ($current_page == 'populate_sample_data.php') ? 'active' : '' ?>">
                    <i class="bi bi-database-fill-gear sidebar-icon text-warning"></i> <span class="nav-text">Sample Data Tool</span>
                </a>
            </li>
            
        </ul>
    </div>

    <!-- STATIC FOOTER -->
    <div class="sidebar-brand p-3 mt-auto bg-midnight" style="border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <a href="../logout.php" class="nav-link sidebar-link text-danger border-0">
            <i class="bi bi-box-arrow-left sidebar-icon"></i> <span class="nav-text">Secure Logout</span>
        </a>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.admin-sidebar');
        const body = document.querySelector('body');
        
        if(localStorage.getItem('sidebarState') === 'minimized') {
            sidebar.classList.add('minimized');
            body.classList.add('sidebar-collapsed');
        }

        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('minimized');
            body.classList.toggle('sidebar-collapsed');
            
            if(sidebar.classList.contains('minimized')) {
                localStorage.setItem('sidebarState', 'minimized');
            } else {
                localStorage.setItem('sidebarState', 'expanded');
            }
        });
    });
</script>