#!/bin/bash

# LayerZero OApp Interactive Configuration & Wiring Tool
#
# Usage: ./scripts/wire.sh
# Or: pnpm wire

clear

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         LayerZero OApp Configuration Wizard                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

pnpm hardhat lz:oapp:wire:interactive "$@"
