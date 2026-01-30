# 3D Home Digital Twin - Docker Deployment

A 3D digital twin application for creating and managing interactive home floor plans with real-time lighting control and visualization.

## Features

- 3D interactive home design with multiple floors
- Real-time lighting control
- Smart walls that hide when blocking view
- Floor plan editor with walls, lights, and objects
- Showcase mode for presentation
- Responsive design for all devices (desktop, tablet, mobile)

## Deployment Options

### Option 1: Docker Compose (Standalone)

#### Quick Start

1. Clone the repository:
```bash
git clone <your-repo-url>
cd home-digital-twin
```

2. Start the container:
```bash
docker-compose up -d
```

3. Access the application:
- Web interface: http://localhost:8000
- Showcase view: http://localhost:8000/showcase

#### Build from source:
```bash
docker-compose build
docker-compose up -d
```

#### Stop the container:
```bash
docker-compose down
```

#### View logs:
```bash
docker-compose logs -f
```

### Option 2: Docker Run (Manual)

#### Build the image:
```bash
docker build -t home-digital-twin .
```

#### Run the container:
```bash
docker run -d \
  --name home-digital-twin \
  -p 8000:8000 \
  -v $(pwd)/data:/data \
  -v $(pwd)/backend/saves:/app/saves \
  -e DATA_DIR=/data \
  --restart unless-stopped \
  home-digital-twin
```

#### Stop and remove:
```bash
docker stop home-digital-twin
docker rm home-digital-twin
```

### Option 3: Home Assistant Addon

#### Prerequisites
- Home Assistant installed
- Access to Home Assistant Supervisor

#### Installation Steps

1. **Add this repository as a custom addon repository:**
   - Go to Home Assistant
   - Navigate to Supervisor → Add-on Store
   - Click the three dots menu (top right)
   - Select "Repositories"
   - Add this repository URL: `https://github.com/yourusername/home-digital-twin`

2. **Install the addon:**
   - Find "3D Home Digital Twin" in the add-on store
   - Click on it and press "Install"
   - Wait for the installation to complete

3. **Configure the addon:**
   - Go to the Configuration tab
   - Adjust settings if needed (default settings work for most cases)
   - Click "Save"

4. **Start the addon:**
   - Go to the Info tab
   - Click "Start"
   - Enable "Start on boot" if you want it to start automatically
   - Enable "Watchdog" for automatic restart on failure

5. **Access the addon:**
   - Click "Open Web UI" button
   - Or access via: http://homeassistant.local:8000
   - Or use the Ingress URL (appears in Home Assistant sidebar)

#### Addon Configuration

The addon supports the following configuration options in `config.json`:

```json
{
  "data_dir": "/data"
}
```

- `data_dir`: Directory where application data is stored (default: `/data`)

## Data Persistence

### Docker Compose / Docker Run
Data is persisted in the following locations:
- `./data` - Application data directory
- `./backend/saves` - Saved home designs

### Home Assistant Addon
Data is persisted in:
- `/data` - Managed by Home Assistant
- `/config` and `/share` - Mapped from Home Assistant

## Environment Variables

- `DATA_DIR` - Data storage directory (default: `/data`)
- `PYTHONUNBUFFERED` - Python unbuffered output (default: `1`)

## Ports

- `8000` - Web interface and API

## Health Check

The container includes a health check that verifies the application is responding:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 5 seconds

## Updating

### Docker Compose
```bash
docker-compose pull
docker-compose up -d
```

### Docker Run
```bash
docker pull home-digital-twin
docker stop home-digital-twin
docker rm home-digital-twin
# Run the container again with the same parameters
```

### Home Assistant Addon
- Go to Supervisor → Dashboard
- Find "3D Home Digital Twin"
- Click "Update" if available

## Backup

### Docker Compose / Docker Run
Backup these directories:
```bash
tar -czf backup.tar.gz data/ backend/saves/
```

### Home Assistant Addon
Use Home Assistant's built-in backup feature:
- Go to Supervisor → Backups
- Create a new backup (partial or full)

## Troubleshooting

### Container won't start
Check logs:
```bash
docker-compose logs -f
# or
docker logs home-digital-twin
```

### Port already in use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Use port 8080 instead
```

### Permission issues
Ensure the data directories have proper permissions:
```bash
chmod -R 755 data/ backend/saves/
```

### Home Assistant addon issues
Check addon logs:
- Go to Supervisor → 3D Home Digital Twin
- Click on "Log" tab

## Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JavaScript with Three.js
- **3D Rendering**: Three.js
- **Storage**: JSON file-based (SQLite optional)

## System Requirements

- Docker 20.10+
- Docker Compose 1.29+ (for compose deployment)
- 512MB RAM minimum
- 1GB disk space

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [Your GitHub Issues URL]
- Documentation: [Your Docs URL]
