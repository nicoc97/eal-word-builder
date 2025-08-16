# Project Structure

This project has been reorganized for better maintainability and clarity.

## Directory Structure

```
├── src/                    # Source code
│   ├── backend/           # PHP backend code
│   │   ├── api/          # API endpoints
│   │   ├── classes/      # PHP classes
│   │   ├── config/       # Configuration files
│   │   └── database/     # Database setup and migrations
│   └── frontend/         # Frontend assets
│       ├── css/          # Stylesheets
│       └── js/           # JavaScript files
├── public/               # Web-accessible files
│   ├── index.html       # Landing page
│   ├── game.html        # Main game interface
│   ├── teacher.html     # Teacher dashboard
│   └── ...              # Other HTML pages
├── tests/               # Test files
├── assets/              # Static assets
│   └── images/          # Images and icons
├── deploy/              # Deployment configurations
│   ├── docker-compose.yml
│   ├── railway.json
│   └── ...
├── docs/                # Documentation
├── data/                # Application data
└── logs/                # Log files
```

## Path Updates Made

- HTML files now reference CSS/JS with `../src/frontend/` prefix
- API calls updated to use `../src/backend/api/` prefix
- Image paths updated to use `../assets/images/` prefix
- PHP includes updated for new directory structure

## Running the Application

The main entry point is still `public/index.html` but now all assets are properly organized and referenced.