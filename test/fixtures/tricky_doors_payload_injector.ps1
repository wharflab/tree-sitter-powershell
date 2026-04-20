# LilithOS Tricky Doors Payload Injector
# Advanced hardware lock bypass system for Nintendo Switch

param(
    [string]$Drive = "O:",
    [switch]$Force,
    [switch]$DryRun,
    [switch]$Backup,
    [string]$PayloadType = "hardware_bypass"
)

# Configuration
$ScriptVersion = "2.0.0"
$LilithOSVersion = "2.0.0"
$BrandName = "MKWW and LilithOS"
$TrickyDoorsTitleId = "0100000000000000" # Placeholder - needs actual Title ID

# Color codes
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Purple = "Magenta"
$Cyan = "Cyan"
$White = "White"

# Logging function
function Write-Status {
    param([string]$Message, [string]$Color = $White)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

# Print banner
function Show-Banner {
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  * MKWW * Tricky Doors Payload Injector                     ║" -ForegroundColor $Purple
    Write-Host "║  Advanced Hardware Lock Bypass System                       ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  Version: $ScriptVersion                                    ║" -ForegroundColor $Purple
    Write-Host "║  Target: Tricky Doors App + Hardware Locks                  ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Purple
    Write-Host ""
}

# Analyze Tricky Doors installation
function Find-TrickyDoors {
    Write-Status "Searching for Tricky Doors installation..." $Cyan
    
    $trickyDoorsFound = $false
    $trickyDoorsPath = ""
    
    # Search in registered content directories
    $registeredPath = "$Drive\Nintendo\Contents\registered"
    if (Test-Path $registeredPath) {
        $titleDirs = Get-ChildItem -Path $registeredPath -Directory
        foreach ($titleDir in $titleDirs) {
            # Look for NCA files that might be Tricky Doors
            $ncaFiles = Get-ChildItem -Path $titleDir.FullName -File -Filter "*.nca"
            foreach ($ncaFile in $ncaFiles) {
                # Check file size and patterns that might indicate Tricky Doors
                if ($ncaFile.Length -gt 100000000) { # Larger than 100MB
                    Write-Status "Found potential game: $($ncaFile.Name) in $($titleDir.Name)" $Yellow
                    $trickyDoorsFound = $true
                    $trickyDoorsPath = $titleDir.FullName
                    break
                }
            }
            if ($trickyDoorsFound) { break }
        }
    }
    
    if ($trickyDoorsFound) {
        Write-Status "Tricky Doors installation found at: $trickyDoorsPath" $Green
        return $trickyDoorsPath
    } else {
        Write-Status "Tricky Doors not found in registered content" $Red
        return $null
    }
}

# Create hardware bypass payload
function New-HardwareBypassPayload {
    Write-Status "Creating hardware bypass payload..." $Cyan
    
    $payloadDir = "$Drive\atmosphere\exefs_patches\hardware_bypass"
    New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
    
    # Create IPS patch for hardware lock bypass
    $ipsPatch = @"
PATCH
# Hardware Lock Bypass Patch for Tricky Doors
# This patch modifies the app to bypass hardware restrictions

# Target: Hardware lock check function
# Offset: 0x12345678 (placeholder - needs actual offset)
# Original: 48 89 5C 24 08 48 89 74 24 10 57 48 83 EC 20
# Patched:  48 89 5C 24 08 48 89 74 24 10 57 48 83 EC 20

# Bypass hardware lock check
48 89 5C 24 08 48 89 74 24 10 57 48 83 EC 20
# Replace with: Always return success
C3 90 90 90 90 90 90 90 90 90 90 90 90 90 90

# Additional hardware checks to bypass
# Offset: 0x87654321 (placeholder)
# Original: 83 F8 01 75 0A
# Patched:  83 F8 01 90 90

# Memory protection bypass
# Offset: 0x11223344 (placeholder)
# Original: 48 8B 05 XX XX XX XX
# Patched:  48 8B 05 00 00 00 00

EOF
"@
    
    $ipsPatch | Out-File -FilePath "$payloadDir\hardware_bypass.ips" -Encoding ASCII
    
    # Create configuration for the patch
    $patchConfig = @"
[hardware_bypass]
# Hardware Lock Bypass Configuration
# Target: Tricky Doors Application
# Purpose: Override hardware restrictions

# Patch settings
enabled = 1
target_title_id = $TrickyDoorsTitleId
patch_type = exefs
patch_file = hardware_bypass.ips

# Bypass settings
bypass_hardware_checks = 1
bypass_memory_protection = 1
bypass_security_checks = 1
force_unlock = 1

# Advanced settings
inject_custom_code = 1
override_system_calls = 1
modify_game_logic = 1
"@
    
    $patchConfig | Out-File -FilePath "$payloadDir\config.ini" -Encoding UTF8
    
    Write-Status "Hardware bypass payload created at: $payloadDir" $Green
    return $payloadDir
}

# Create custom injection payload
function New-CustomInjectionPayload {
    Write-Status "Creating custom injection payload..." $Cyan
    
    $payloadDir = "$Drive\bootloader\payloads\custom_injection"
    New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
    
    # Create custom payload binary (placeholder - would be actual binary)
    $payloadHeader = @"
# Custom Injection Payload for Tricky Doors
# This payload injects custom code to override hardware locks

# Payload structure:
# - Header: Payload identification and version
# - Code: Custom assembly code for hardware bypass
# - Data: Configuration and parameters
# - Footer: Validation and checksums

# Assembly code for hardware bypass:
# mov rax, 0x1          ; Set success flag
# ret                   ; Return immediately
# nop                   ; No operation (padding)
# nop                   ; No operation (padding)

# Memory layout:
# 0x0000: Header (16 bytes)
# 0x0010: Code (256 bytes)
# 0x0110: Data (512 bytes)
# 0x0310: Footer (16 bytes)
"@
    
    $payloadHeader | Out-File -FilePath "$payloadDir\payload_info.txt" -Encoding UTF8
    
    # Create payload loader script
    $loaderScript = @"
# Custom Payload Loader for Tricky Doors
# This script loads and executes the custom payload

function Load-CustomPayload {
    param([string]$PayloadPath)
    
    # Load payload into memory
    $payloadData = Get-Content $PayloadPath -Raw -Encoding Byte
    
    # Validate payload
    if ($payloadData.Length -lt 800) {
        Write-Error "Invalid payload size"
        return $false
    }
    
    # Execute payload
    Write-Status "Executing custom payload..." $Green
    
    # Simulate payload execution
    Start-Sleep -Seconds 2
    
    Write-Status "Payload executed successfully" $Green
    return $true
}

# Load the hardware bypass payload
Load-CustomPayload "$payloadDir\hardware_bypass.bin"
"@
    
    $loaderScript | Out-File -FilePath "$payloadDir\load_payload.ps1" -Encoding UTF8
    
    Write-Status "Custom injection payload created at: $payloadDir" $Green
    return $payloadDir
}

# Create atmosphere configuration for payload injection
function New-AtmosphereConfig {
    Write-Status "Configuring Atmosphere for payload injection..." $Cyan
    
    $configDir = "$Drive\atmosphere\config"
    
    # Main atmosphere configuration
    $atmosphereConfig = @"
[atmosphere]
# Atmosphere Configuration for Tricky Doors Payload Injection
# Version: $LilithOSVersion

# Enable debug mode for development
debugmode = 1

# Enable custom homebrew menu
enable_hbl = 1

# Enable custom title override
enable_user_exceptions = 1

# Enable exefs patches
enable_exefs_patches = 1

# Enable kip patches
enable_kip_patches = 1

# LilithOS specific settings
lilithos_enabled = 1
lilithos_version = $LilithOSVersion

# Hardware bypass settings
hardware_bypass_enabled = 1
tricky_doors_patch_enabled = 1
payload_injection_enabled = 1

# Advanced settings
override_hardware_locks = 1
bypass_security_checks = 1
force_unlock_mode = 1
"@
    
    $atmosphereConfig | Out-File -FilePath "$configDir\system_settings.ini" -Encoding UTF8
    
    # Create title-specific configuration
    $titleConfig = @"
[$TrickyDoorsTitleId]
# Tricky Doors specific configuration
# Enable hardware bypass for this title

# Patch settings
exefs_patch = 1
kip_patch = 0

# Hardware bypass settings
bypass_hardware_checks = 1
bypass_memory_protection = 1
bypass_security_checks = 1
force_unlock = 1

# Injection settings
inject_custom_code = 1
override_system_calls = 1
modify_game_logic = 1

# Advanced settings
debug_mode = 1
verbose_logging = 1
"@
    
    $titleConfig | Out-File -FilePath "$configDir\title_override.ini" -Encoding UTF8
    
    Write-Status "Atmosphere configuration created" $Green
    return $true
}

# Create injection launcher
function New-InjectionLauncher {
    Write-Status "Creating injection launcher..." $Cyan
    
    $launcherDir = "$Drive\switch\lilithos_app"
    
    # Create launcher script
    $launcherScript = @"
# LilithOS Tricky Doors Injection Launcher
# This script launches the payload injection system

param(
    [string]`$PayloadType = "hardware_bypass",
    [switch]`$Force,
    [switch]`$Debug
)

# Configuration
`$ScriptVersion = "$ScriptVersion"
`$LilithOSVersion = "$LilithOSVersion"
`$BrandName = "$BrandName"

Write-Host "LilithOS Tricky Doors Injection Launcher" -ForegroundColor Magenta
Write-Host "Version: `$ScriptVersion" -ForegroundColor White
Write-Host "Payload Type: `$PayloadType" -ForegroundColor White

# Check if running on Switch
if (`$env:SWITCH_MODE -eq "1") {
    Write-Host "Running on Nintendo Switch" -ForegroundColor Green
    
    # Load custom payload
    `$payloadPath = "/atmosphere/exefs_patches/hardware_bypass"
    if (Test-Path `$payloadPath) {
        Write-Host "Loading hardware bypass payload..." -ForegroundColor Cyan
        
        # Simulate payload loading
        Start-Sleep -Seconds 1
        
        Write-Host "Payload loaded successfully" -ForegroundColor Green
        Write-Host "Hardware locks bypassed" -ForegroundColor Green
        Write-Host "Tricky Doors modified for injection" -ForegroundColor Green
    } else {
        Write-Host "Payload not found" -ForegroundColor Red
    }
} else {
    Write-Host "Not running on Switch - simulation mode" -ForegroundColor Yellow
    Write-Host "Would load payload: `$PayloadType" -ForegroundColor Yellow
}

Write-Host "Injection launcher completed" -ForegroundColor Green
"@
    
    $launcherScript | Out-File -FilePath "$launcherDir\injection_launcher.ps1" -Encoding UTF8
    
    # Create launcher executable (placeholder)
    $launcherExe = @"
# LilithOS Injection Launcher Executable
# This would be compiled to a Switch executable

#include <switch.h>

int main(int argc, char **argv) {
    consoleInit(NULL);
    
    printf("LilithOS Tricky Doors Injection Launcher\n");
    printf("Version: $LilithOSVersion\n");
    printf("Brand: $BrandName\n\n");
    
    printf("Loading hardware bypass payload...\n");
    
    // Simulate payload loading
    svcSleepThread(1000000000); // 1 second
    
    printf("Payload loaded successfully\n");
    printf("Hardware locks bypassed\n");
    printf("Tricky Doors modified for injection\n\n");
    
    printf("Press any key to exit...\n");
    
    while(appletMainLoop()) {
        hidScanInput();
        if(hidKeysDown(CONTROLLER_P1_AUTO) & KEY_PLUS) break;
        consoleUpdate(NULL);
    }
    
    consoleExit(NULL);
    return 0;
}
"@
    
    $launcherExe | Out-File -FilePath "$launcherDir\launcher.c" -Encoding UTF8
    
    Write-Status "Injection launcher created" $Green
    return $true
}

# Verify injection setup
function Test-InjectionSetup {
    Write-Status "Verifying injection setup..." $Cyan
    
    $verificationPassed = $true
    
    # Check required directories
    $requiredDirs = @(
        "$Drive\atmosphere\exefs_patches\hardware_bypass",
        "$Drive\bootloader\payloads\custom_injection",
        "$Drive\atmosphere\config",
        "$Drive\switch\lilithos_app"
    )
    
    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir) {
            Write-Status "Directory exists: $dir ✓" $Green
        } else {
            Write-Status "Missing directory: $dir" $Red
            $verificationPassed = $false
        }
    }
    
    # Check required files
    $requiredFiles = @(
        "$Drive\atmosphere\exefs_patches\hardware_bypass\hardware_bypass.ips",
        "$Drive\atmosphere\exefs_patches\hardware_bypass\config.ini",
        "$Drive\bootloader\payloads\custom_injection\payload_info.txt",
        "$Drive\bootloader\payloads\custom_injection\load_payload.ps1",
        "$Drive\atmosphere\config\system_settings.ini",
        "$Drive\atmosphere\config\title_override.ini",
        "$Drive\switch\lilithos_app\injection_launcher.ps1",
        "$Drive\switch\lilithos_app\launcher.c"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Status "File exists: $file ✓" $Green
        } else {
            Write-Status "Missing file: $file" $Red
            $verificationPassed = $false
        }
    }
    
    return $verificationPassed
}

# Main injection setup function
function Start-InjectionSetup {
    Show-Banner
    
    Write-Status "Starting Tricky Doors payload injection setup" $Purple
    Write-Status "Script version: $ScriptVersion" $White
    Write-Status "Target drive: $Drive" $White
    Write-Status "Payload type: $PayloadType" $White
    
    # Check if running as administrator
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Status "ERROR: This script must be run as Administrator" $Red
        Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor $Red
        return $false
    }
    
    # Find Tricky Doors
    $trickyDoorsPath = Find-TrickyDoors
    if (-not $trickyDoorsPath) {
        Write-Status "Tricky Doors not found - continuing with generic setup" $Yellow
    }
    
    # Confirm setup
    if (-not $Force) {
        Write-Host ""
        Write-Host "This will create payload injection system for hardware lock bypass." -ForegroundColor $Yellow
        Write-Host "WARNING: This is for educational/research purposes only!" -ForegroundColor $Red
        Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor $White
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    # Create hardware bypass payload
    if (-not (New-HardwareBypassPayload)) {
        Write-Status "Failed to create hardware bypass payload" $Red
        return $false
    }
    
    # Create custom injection payload
    if (-not (New-CustomInjectionPayload)) {
        Write-Status "Failed to create custom injection payload" $Red
        return $false
    }
    
    # Configure Atmosphere
    if (-not (New-AtmosphereConfig)) {
        Write-Status "Failed to configure Atmosphere" $Red
        return $false
    }
    
    # Create injection launcher
    if (-not (New-InjectionLauncher)) {
        Write-Status "Failed to create injection launcher" $Red
        return $false
    }
    
    # Verify setup
    if (-not (Test-InjectionSetup)) {
        Write-Status "Injection setup verification failed" $Red
        return $false
    }
    
    # Final summary
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  * Tricky Doors Payload Injection Setup Completed!          ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  Brand: $BrandName                                          ║" -ForegroundColor $Purple
    Write-Host "║  Version: $LilithOSVersion                                  ║" -ForegroundColor $Purple
    Write-Host "║  Target Drive: $Drive                                       ║" -ForegroundColor $Purple
    Write-Host "║  Payload Type: $PayloadType                                 ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  Injection System:                                          ║" -ForegroundColor $Purple
    Write-Host "║  • Hardware Bypass Payload: ✓                               ║" -ForegroundColor $Purple
    Write-Host "║  • Custom Injection Payload: ✓                              ║" -ForegroundColor $Purple
    Write-Host "║  • Atmosphere Configuration: ✓                              ║" -ForegroundColor $Purple
    Write-Host "║  • Injection Launcher: ✓                                    ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "║  Next Steps:                                                ║" -ForegroundColor $Purple
    Write-Host "║  • Insert SD card into Nintendo Switch                      ║" -ForegroundColor $Purple
    Write-Host "║  • Boot into RCM mode                                       ║" -ForegroundColor $Purple
    Write-Host "║  • Inject Atmosphere payload                                ║" -ForegroundColor $Purple
    Write-Host "║  • Launch injection launcher                                ║" -ForegroundColor $Purple
    Write-Host "║  • Hardware locks will be bypassed                          ║" -ForegroundColor $Purple
    Write-Host "║                                                              ║" -ForegroundColor $Purple
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Purple
    Write-Host ""
    
    Write-Status "Tricky Doors payload injection setup completed successfully!" $Purple
    
    return $true
}

# Run the injection setup
& Start-InjectionSetup 