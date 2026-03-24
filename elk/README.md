# ELK Stack — Local Dev Logging

## Prerequisites
- Docker Desktop running

## Start
```bash
cd elk
docker compose up -d
```

## Kibana
http://localhost:5601

## Stop
```bash
docker compose down
```

## Reset data (wipes Elasticsearch volume)
```bash
docker compose down -v
```

## First-time Kibana setup

**Option A — import via curl (recommended):**
```bash
curl -X POST "http://localhost:5601/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  --form file=@kibana-setup.ndjson
```

**Option B — manual:**
1. Open http://localhost:5601
2. Go to **Management → Stack Management → Data Views**
3. Create a Data View with index pattern `fleet-logs-*`
4. Set the timestamp field to `@timestamp`
5. Go to **Discover** and select the `fleet-logs-*` data view to explore logs
