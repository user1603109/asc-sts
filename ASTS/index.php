<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASTS | Apayao State College</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <style>
        /* Base Colors */
        body {
            background-color: #FFFFFF;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Midnight Navy Blue */
        .text-navy { color: #0A192F !important; }
        .bg-navy { background-color: #0A192F !important; }
        
        .btn-navy { 
            background-color: #0A192F; 
            color: #FFFFFF; 
            border: 2px solid #0A192F;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-navy:hover { 
            background-color: #0d274c; 
            color: #FFFFFF; 
            border-color: #0d274c;
            transform: translateY(-2px);
        }

        /* Amber (FFBF00) */
        .text-amber { color: #FFBF00 !important; }
        .bg-amber { background-color: #FFBF00 !important; }
        
        .btn-amber { 
            background-color: #FFBF00; 
            color: #0A192F; 
            border: 2px solid #FFBF00;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-amber:hover { 
            background-color: #e6ac00; 
            color: #0A192F; 
            border-color: #e6ac00;
            transform: translateY(-2px);
        }

        /* Layout modifications for Footer positioning */
        .hero-section {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            width: 100%;
        }

        /* Subtle decorative element for the modernistic feel */
        .decorator-circle {
            position: absolute;
            width: 400px;
            height: 400px;
            background: rgba(255, 191, 0, 0.05); /* Amber with low opacity */
            border-radius: 50%;
            top: -100px;
            right: -100px;
            z-index: 0;
        }
        .hero-content {
            z-index: 1;
        }

        /* Admin Link Hover Effect */
        .admin-footer-link {
            text-decoration: none; 
            transition: opacity 0.3s ease;
        }
        .admin-footer-link:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body class="d-flex flex-column min-vh-100">

    <div class="hero-section flex-grow-1 px-4">
        <div class="decorator-circle"></div>
        
        <div class="container text-center hero-content">
            
            <img src="assets/img/astslogo.png" alt="ASTS Logo" class="img-fluid mb-4" style="max-height: 150px; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.25));">

            <h1 class="display-3 fw-bolder text-navy mb-2 tracking-tight">
                Automated Scoring <br/> & Tabulation System
            </h1>
            
            <h3 class="fw-bold text-amber mb-4">
                Apayao State College
            </h3>
            
            <p class="lead text-muted mb-5 mx-auto" style="max-width: 600px;">
                A modern, secure, and efficient platform for managing campus events, live scoring, and real-time tabulations.
            </p>
            
            <div class="d-flex justify-content-center gap-3 mt-4">
                <a href="login.php" class="btn btn-navy btn-lg px-5 py-2 shadow-sm rounded-pill">Login</a>
                <a href="register.php" class="btn btn-amber btn-lg px-5 py-2 shadow-sm rounded-pill">Register</a>
            </div>
        </div>
    </div>

    <!-- Updated Footer -->
    <footer class="py-4 text-center mt-auto bg-navy shadow-lg">
        <a href="admin/adminlogin.php" class="admin-footer-link">
            <span class="text-amber fw-bold">Automated Scoring and Tabulation System</span> 
            <span class="text-white">&copy; 2026</span>
        </a>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>