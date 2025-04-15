# Development Environment Setup Guide (WSL2 + Nix + Devenv + Direnv)

This guide will walk you through setting up a consistent and isolated development environment for the Pai Gow Poker project on your Windows machine. We'll use:

* **WSL2 (Windows Subsystem for Linux):** Allows running a real Linux environment directly on Windows.
* **Debian:** A stable Linux distribution we'll run inside WSL2.
* **Nix:** A powerful package manager that ensures everyone uses the exact same versions of tools and dependencies, defined by the project.
* **Devenv:** A tool built on Nix that makes creating developer environments easier. It reads project configuration files (`devenv.nix`, `flake.nix`) to set up tools like Node.js, pnpm, etc.
* **Direnv:** A utility that automatically loads and unloads environment variables (and activates Devenv environments) when you enter or leave a project directory.
* **Git:** For cloning the project repository.

**Goal:** When you `cd` into the project directory within your Debian WSL2 environment, Direnv and Devenv will automatically ensure you have the correct versions of Node.js and pnpm available, exactly as defined by the project, without interfering with any other tools installed on your system.

---

## Prerequisites:

* Windows 10 (version 2004 or later) or Windows 11.
* Administrator access on your Windows machine.

---

## Step 1: Enable WSL2 and Install Debian

1.  **Open PowerShell as Administrator:**
    * Search for "PowerShell" in the Start Menu.
    * Right-click "Windows PowerShell" and select "Run as administrator".
2.  **Install WSL and Debian:** Run the following command in the Administrator PowerShell window. This command enables necessary Windows features, installs WSL2, and installs the default Linux distribution (usually Ubuntu, but we'll install Debian next if needed).
    ```powershell
    wsl --install
    ```
    * You might be prompted to restart your computer. Do so if required.
3.  **Install Debian:**
    ```powershell
    wsl --install -d Debian
    ```
4.  **Launch Debian for Initial Setup:**
    ```powershell
    wsl -d Debian
    ```

You are now inside your Debian environment running on WSL2! The rest of the commands will be run inside this Debian terminal unless otherwise specified.

---

## Step 2: Install Nix Package Manager

Nix manages our development tools in a reproducible way. We'll install it using the official multi-user installer.

1.  **Update Debian's Package List:** (*Optional but recommended*)
    ```bash
    sudo apt update
    ```
    * Enter the Debian password you created earlier when prompted for `sudo`.
2.  **Install curl:** (Nix installer uses it)
    ```bash
    sudo apt install curl -y
    ```
3.  **Run the Nix Installer:** Paste and run the following command in your Debian terminal:
    ```bash
    curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | \
      sh -s -- install
    ```
    * This script will download Nix, set it up as a system service (`--daemon`), configure necessary files, and might ask for your `sudo` password again. Accept the defaults if unsure.
4.  **IMPORTANT:** Restart Your Debian Shell: For the Nix installation to take effect correctly (especially path settings), you **must** close your current Debian terminal window and open a new one. Launch "Debian" from the Start Menu again.

---

## Step 3: Install Git

Git is needed to clone the project repository. It might already be installed, but let's ensure it is.

1.  **Install Git:** In your new Debian terminal:
    ```bash
    sudo apt install git -y
    ```

---

## Step 4: Install Devenv and Direnv using Nix

Now we use Nix to install the developer environment tools themselves.

1.  **Install Devenv:**
    ```bash
    nix-profile install nixpkgs#devenv
    ```
    * Nix will download and install Devenv into your Nix user profile.
2.  **Install Direnv:**
    ```bash
    nix-profile install nixpkgs#direnv
    ```
3.  **IMPORTANT:** Restart Your Debian Shell Again: Close and reopen the Debian terminal to ensure `devenv` and `direnv` are recognized in your PATH.

---

## Step 5: Configure Direnv Hook

Direnv needs to hook into your shell to automatically activate environments when you change directories.

1.  **Add Direnv Hook to Bash Profile:** Assuming you are using the default Bash shell in Debian, run this command:
    ```bash
    echo 'eval "$(direnv hook bash)"' ~/.bashrc
    ```
    * This appends the necessary command to your shell's configuration file (`.bashrc`).
2.  **IMPORTANT:** Restart Your Debian Shell One More Time: Close and reopen the Debian terminal for the hook to become active.

---

## Step 6: Clone the Project and Enter the Directory

1.  **Navigate to Your Development Folder:** Choose where you want to store your projects. For example:
    ```bash
    mkdir ~/git
    cd ~/git
    ```
    *(Note: `~` is your home directory inside Debian)*
2.  **Clone the Pai Gow Poker Repository:**:
    ```bash
    git clone https://github.com/nightconcept/pai-gow-poker.git
    ```
3.  **Enter the Project Directory:**:
    ```bash
    cd pai-gow-poker
    ```

---

## Step 7: Allow Direnv and Activate Devenv Environment

1.  **Allow Direnv:** As soon as you enter the project directory, Direnv should detect an `.envrc` file (which should have been generated by `devenv init` or already exist in the repo). It will print a security message and prompt you to allow it. Type:
    ```bash
    direnv allow
    ```
2.  **Automatic Environment Setup:**
    * Once allowed, Direnv will execute the `.envrc` file.
    * This typically contains a command like `use flake .` or `use devenv`.
    * Devenv will then read the `devenv.nix` or `flake.nix` file in your project.
    * **First Time:** Nix will download and build all the specified dependencies (Node.js, pnpm, etc.). This might take several minutes, depending on the dependencies and your internet speed. You'll see a lot of output from Nix/Devenv.
    * **Subsequent Times:** Entering the directory will be much faster as Nix caches the built environment.

---

## Step 8: Verify the Environment

Once Devenv finishes setting up (your command prompt should return), verify that the correct tools are available:

1.  **Check Node.js Version:**
    ```bash
    node --version
    ```
2.  **Check pnpm Version:**
    ```bash
    pnpm --version
    ```

These commands should output the specific versions of Node.js and pnpm defined in the project's `devenv.nix` or `flake.nix` file, not any globally installed versions.
