import sys
import subprocess

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "streamlit":
        subprocess.run(["streamlit", "run", "streamlit_app.py"])
    else:
        print("Usage:")
        print("  python main.py streamlit")

if __name__ == "__main__":
    main()
