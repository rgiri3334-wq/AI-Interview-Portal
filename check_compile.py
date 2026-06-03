import py_compile
import sys
try:
    py_compile.compile('Main.py', doraise=True)
    print("Main.py compiles successfully")
except Exception as e:
    print(f"Compilation error: {e}")
