CREATE ROLE keycloak WITH LOGIN PASSWORD 'p';
CREATE DATABASE keycloak OWNER keycloak;
\connect keycloak
CREATE SCHEMA IF NOT EXISTS keycloak AUTHORIZATION keycloak;
