#!/usr/bin/env bash
# Konfiguriert den Keycloak-Realm "javascript" via REST-API.
# Voraussetzung: Keycloak läuft im start-dev-Modus auf http://localhost:8080
# Aufruf: extras/keycloak/setup-realm.sh

set -euo pipefail

KC_URL="${KEYCLOAK_URL:-http://localhost:8080}"
CLIENT_SECRET="${CLIENT_SECRET:-dg72WHaMP2GB4sZVhk6ExJDP3rH4tYjz}"

echo "Warte auf Keycloak unter $KC_URL ..."
until curl -fs "$KC_URL/health/ready" > /dev/null 2>&1; do
  sleep 3
done
echo "Keycloak ist bereit."

# Admin-Token vom Master-Realm holen
TOKEN=$(curl -s -X POST "$KC_URL/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Fehler: Konnte keinen Admin-Token holen." >&2
  exit 1
fi

AUTH="-H \"Authorization: Bearer $TOKEN\""

# Realm "javascript" anlegen
echo "Lege Realm 'javascript' an ..."
curl -s -o /dev/null -w "%{http_code}" -X POST "$KC_URL/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"realm":"javascript","enabled":true,"accessTokenLifespan":1800,"ssoSessionIdleTimeout":3600}'

# Client anlegen
echo "Lege Client 'javascript-client' an ..."
curl -s -o /dev/null -X POST "$KC_URL/admin/realms/javascript/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"javascript-client\",
    \"name\": \"JavaScript Client\",
    \"enabled\": true,
    \"publicClient\": false,
    \"clientAuthenticatorType\": \"client-secret\",
    \"secret\": \"$CLIENT_SECRET\",
    \"directAccessGrantsEnabled\": true,
    \"serviceAccountsEnabled\": true,
    \"standardFlowEnabled\": true,
    \"rootUrl\": \"https://localhost:3000\",
    \"redirectUris\": [\"*\"],
    \"webOrigins\": [\"+\"]
  }"

# Client-UUID ermitteln
CLIENT_UUID=$(curl -s "$KC_URL/admin/realms/javascript/clients?clientId=javascript-client" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
echo "Client-UUID: $CLIENT_UUID"

# Rollen anlegen
for ROLE in admin user; do
  echo "Lege Rolle '$ROLE' an ..."
  curl -s -o /dev/null -X POST "$KC_URL/admin/realms/javascript/clients/$CLIENT_UUID/roles" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$ROLE\"}"
done

# Hilfsfunktion: User anlegen und Rolle zuweisen
create_user() {
  local USERNAME="$1"
  local EMAIL="$2"
  local FIRSTNAME="$3"
  local LASTNAME="$4"
  local ROLE="$5"

  echo "Lege User '$USERNAME' an ..."
  curl -s -o /dev/null -X POST "$KC_URL/admin/realms/javascript/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\",
      \"email\": \"$EMAIL\",
      \"firstName\": \"$FIRSTNAME\",
      \"lastName\": \"$LASTNAME\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"credentials\": [{\"type\":\"password\",\"value\":\"p\",\"temporary\":false}]
    }"

  local USER_ID
  USER_ID=$(curl -s "$KC_URL/admin/realms/javascript/users?username=$USERNAME" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

  local ROLE_JSON
  ROLE_JSON=$(curl -s "$KC_URL/admin/realms/javascript/clients/$CLIENT_UUID/roles/$ROLE" \
    -H "Authorization: Bearer $TOKEN")

  echo "Weise Rolle '$ROLE' dem User '$USERNAME' zu ..."
  curl -s -o /dev/null -X POST \
    "$KC_URL/admin/realms/javascript/users/$USER_ID/role-mappings/clients/$CLIENT_UUID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "[$ROLE_JSON]"
}

create_user "admin" "admin@acme.com" "JavaScript" "Admin" "admin"
create_user "user"  "user@acme.com"  "JavaScript" "User"  "user"

echo "Keycloak-Realm 'javascript' vollständig konfiguriert."
