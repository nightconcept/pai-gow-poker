# Setting up Node.js LTS and PNPM on Windows using Scoop

This guide walks you through installing the Scoop package manager on Windows, then using it to install the Long-Term Support (LTS) version of Node.js and the PNPM package manager.

## Prerequisites

* Windows Operating System (Windows 10 or later recommended)
* PowerShell (Version 5.1 or later, usually included with modern Windows)
* Windows Terminal is recommended for a better command-line experience.

## Step 1: Install Scoop

Scoop is a command-line installer for Windows that simplifies installing developer tools.

1.  **Open PowerShell:** Search for "PowerShell" in the Start menu, right-click it, and select "Run as administrator" **OR** open a regular PowerShell window. Running as administrator might be needed for the *first* command below if you encounter permissions issues, but try without elevated privileges first using the `CurrentUser` scope.

2.  **Allow Script Execution (If necessary):** Scoop requires running scripts. If you haven't already, you might need to change the execution policy for your user account. Run the following command in PowerShell:
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
    Press `Y` and Enter if prompted to confirm. If this command fails due to permissions, you might need to run PowerShell as an administrator specifically for this step.

3.  **Install Scoop:** Run the following command in PowerShell:
    ```powershell
    irm get.scoop.sh | iex
    ```
    This command downloads (`irm` is Invoke-RestMethod) the Scoop installer script and executes (`iex` is Invoke-Expression) it.

4.  **Verify Installation:** Close and reopen PowerShell to ensure Scoop is added to your PATH. Then run:
    ```powershell
    scoop --version
    ```
    You should see the installed Scoop version number.

## Step 2: Install Node.js LTS using Scoop

Scoop makes installing specific versions or channels (like LTS) of software easy.

1.  **Install Node.js LTS:** Open a new PowerShell window (if you haven't already) and run:
    ```powershell
    scoop bucket add main # Potentially optional since this is usually a default
    scoop install nodejs-lts
    ```
    Scoop will download and install the current LTS version of Node.js, along with the corresponding version of NPM (Node Package Manager), which comes bundled with Node.js.

2.  **Verify Node.js Installation:** Run the following commands to check the installed versions:
    ```powershell
    node -v
    npm -v
    ```
    You should see the version numbers for Node.js (matching the current LTS) and NPM.

## Step 3: Install PNPM using Scoop

PNPM is an alternative package manager for Node.js known for its speed and efficiency with disk space.

1.  **Install PNPM:** In PowerShell, run:
    ```powershell
    scoop bucket add main # Likely optional since the bucket was added above
    scoop install pnpm
    ```
    Scoop will download and install PNPM.

2.  **Verify PNPM Installation:** Run:
    ```powershell
    pnpm -v
    ```
    You should see the installed PNPM version number.

## Step 4: Use PNPM in Your Project

Now that your environment is set up, you can use PNPM to manage your project's dependencies.

1.  **Navigate to your project directory:** Open PowerShell or your terminal and change to the directory containing your project (where your `package.json` file is located).
    ```powershell
    cd path\to\your\project
    ```
    (Replace `path\to\your\project` with the actual path).

2.  **Install Dependencies:** Run the following command to install the project dependencies listed in your `package.json` file using PNPM:
    ```powershell
    pnpm install
    ```

---

You now have Scoop managing your Node.js LTS and PNPM installations on Windows. Running `pnpm install` will set up the dependencies for your specific project.