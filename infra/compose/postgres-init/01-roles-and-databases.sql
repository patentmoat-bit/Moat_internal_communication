-- Local development bootstrap.
--
-- Mirrors the production separation from MOAT_SYSTEM_DESIGN.md §5 and §6:
--   * application, identity and workflow data live in separate databases
--     with separate credentials;
--   * the application connects as a NON-OWNER role without BYPASSRLS, so
--     row-level security is exercised in development rather than discovered
--     to be broken in staging.
--
-- Temporal creates its own `temporal` and `temporal_visibility` databases
-- through the auto-setup image, so they are not created here.

\set ON_ERROR_STOP on

-- --- Application ------------------------------------------------------------
CREATE ROLE moat_owner LOGIN PASSWORD :'moat_owner_password' NOBYPASSRLS;
CREATE ROLE moat_app   LOGIN PASSWORD :'moat_app_password'   NOBYPASSRLS;

CREATE DATABASE moat OWNER moat_owner;

\connect moat

-- Migrations run as the owner; the running application never does.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO moat_app;

ALTER DEFAULT PRIVILEGES FOR ROLE moat_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO moat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE moat_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO moat_app;

-- --- Identity ---------------------------------------------------------------
\connect postgres

CREATE ROLE keycloak LOGIN PASSWORD :'keycloak_password';
CREATE DATABASE keycloak OWNER keycloak;
