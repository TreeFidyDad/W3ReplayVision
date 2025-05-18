import subprocess
import os
import glob
import sys

def prompt_cleanup_parsed_replays(parsed_csv_folder):
    csvs = glob.glob(os.path.join(parsed_csv_folder, "*.csv"))
    if len(csvs) <= 10:
        return  # Don't prompt if not enough files to worry about
    print(f"\nThere are currently {len(csvs)} parsed CSV files in '{parsed_csv_folder}'.")
    answer = input("Do you want to delete ALL files in this folder? (y/N): ").strip().lower()
    if answer == "y":
        for f in csvs:
            try:
                os.remove(f)
            except Exception as e:
                print(f"Failed to delete {f}: {e}")
        print("All CSVs deleted.")
    else:
        print("No files deleted.")

def main():
    # Always operate from the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Prompt for cleanup before any processing
    csv_folder = os.path.join(script_dir, "parsed_replays")
    prompt_cleanup_parsed_replays(csv_folder)

    # 1. Run Node.js script (lets you select replay, then creates CSV)
    print("Launching Node.js parser. Select your replay when prompted.")
    try:
        subprocess.run(["node", "w3replayvision_export.js"], check=True)
    except FileNotFoundError:
        print("ERROR: Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    except subprocess.CalledProcessError:
        print("ERROR: Node.js script failed. Please check the output above.")
        sys.exit(1)

    # 2. Find the most recently modified CSV in the output folder
    csv_folder = os.path.join(script_dir, "parsed_replays")
    csv_files = glob.glob(os.path.join(csv_folder, "*.csv"))
    if not csv_files:
        print("No CSVs found in", csv_folder)
        sys.exit(1)
    latest_csv = max(csv_files, key=os.path.getmtime)
    print(f"Auto-selected latest CSV: {latest_csv}")

    # 3. Call your actual visualization script, passing the CSV path as an argument
    try:
        subprocess.run(["python", "w3replayvision_visualizer.py", latest_csv], check=True)
    except FileNotFoundError:
        print("ERROR: Python is not installed or not in PATH. Please install Python from https://python.org/")
        sys.exit(1)
    except subprocess.CalledProcessError:
        print("ERROR: Visualization script failed. Please check the output above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
