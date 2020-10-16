# Hackathon Project (UQCS 2020)

## Project Ideas

- What about my old competitive programming game idea?
  - I'd need to write a cpu arch that I can modify.
    - This is pretty easy.
    - Start with a 16bit address space and add just enough instructions to run C code.
      - I would probably end up cloning an existing architecture.
  - I also need to re-target a C compiler to this architecture.
    - What are the easiest compilers to re-target?
    - Retargeting looks more difficult than I was expecting.
    - The hard part is I need to re-implement a code generator and compiler.
  - I need a basic emulator for the system.
    - Easy enough to write once I have an micro-architecture.
  - I also need game stuff.

## TODO List

- Better error descriptions
