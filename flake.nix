/**
  ## Access `devShells.${system}.default`

  ```bash
  nix develop --impure
  ```

  ## Attributions

  - https://wiki.nixos.org/wiki/Docker/en
*/
{
  description = "Define dependencies for useage and development for repository";

  /**
   * WARN: `inputs` should be used for shared development to maximize reproducible results
   *       for now though add an `--impure` to `nix develop` command doc-comment examples
   */
  inputs = {
    # nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = (import <nixpkgs> { }).pkgs;
      lib = (import <nixpkgs> { }).lib;
      # pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system} = {
        /**
          ```bash
          nix develop --impure .#default
          ```
        */
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            docker-compose
          ];
        };

        /**
         * ```nix
         * nix develop .#chromium
         * ```
         */
        chromium = pkgs.mkShell {
          shellHook = ''
            ${lib.getExe pkgs.ungoogled-chromium} --incognito 'http://api.localhost:8080/' --password-store=basic;
            exit;
          '';
        };

        docker-compose = {
          shell = {
            /**
              ```bash
              nix develop .#docker-compose.shell.api
              ```
            */
            api = pkgs.mkShell {
              shellHook = ''
                ${lib.getExe pkgs.docker-compose} run --remove-orphans api /bin/ash;
                exit;
              '';
            };
          };

          /**
            ```bash
            nix develop .#docker-compose.remove-orphans
            ```
          */
          remove-orphans = pkgs.mkShell {
            shellHook = ''
              ${lib.getExe pkgs.docker-compose} down --remove-orphans;
              exit;
            '';
          };

          npm-run = {
            /**
              ```bash
              nix develop .#docker-compose.npm-run.api.audit-fix

              nix develop .#docker-compose.npm-run.api.install

              nix develop .#docker-compose.npm-run.api.check
              ```
            */
            api = {
              audit-fix = pkgs.mkShell {
                shellHook = ''
                  ${lib.getExe pkgs.docker-compose} run --remove-orphans api npm audit fix --force;
                  exit;
                '';
              };

              install = pkgs.mkShell {
                shellHook = ''
                  ${lib.getExe pkgs.docker-compose} run --remove-orphans api npm install;
                  exit;
                '';
              };

              check = pkgs.mkShell {
                shellHook = ''
                  ${lib.getExe pkgs.docker-compose} run --remove-orphans api npm run check;
                  exit;
                '';
              };

              /**
                ```bash
                nix develop .#docker-compose.npm-run.api.tsup-build.all
                ```
              */
              tsup-build =
                let
                  targets = [
                    "all"
                    "api"
                  ];
                in
                lib.attrsets.listToAttrs (
                  lib.lists.map (name: {
                    inherit name;
                    value = pkgs.mkShell {
                      shellHook = ''
                        ${lib.getExe pkgs.docker-compose} run --remove-orphans api npm run tsup-build:${name};
                        exit;
                      '';
                    };
                  }) targets
                );
            };
          };

          /**
           * ```nix
           * nix develop .#docker-compose.up
           * ```
           */
          up = pkgs.mkShell {
            shellHook = ''
              ${lib.getExe pkgs.docker-compose} up;
              exit;
            '';
          };

          /**
           * ```nix
           * nix develop .#docker-compose.up-watch
           * ```
           */
          up-watch = pkgs.mkShell {
            shellHook = ''
              ${lib.getExe pkgs.docker-compose} up --watch;
              exit;
            '';
          };

          /**
           * ```nix
           * nix develop .#docker-compose.upgrade
           * ```
           */
          upgrade = pkgs.mkShell {
            shellHook =
              let
                docker-compose = lib.getExe pkgs.docker-compose;
                docker = lib.getExe pkgs.docker;
              in
              ''
                ${docker-compose} pull;
                ${docker-compose} up -d --remove-orphans;
                ${docker} image prune;
                exit;
              '';
          };

          /**
           * ```nix
           * nix develop .#docker-compose.restart.nginx
           * ```
           */
          restart = {
            nginx = pkgs.mkShell {
              shellHook = ''
                ${lib.getExe pkgs.docker-compose} restart nginx;
                exit;
              '';
            };
          };
        };
      };
    };
}
