# PlasmaGrid

<p align="center">
  <img src="logo.jpg" alt="Logo" style="width: 50%;" />
</p>

## Overview

### LLM Based - Grid Bot Strategy
We utilize 1inch's limit order api's to create a grid bot strategy that is powered by LLMs. The bot is designed to execute trades based on the current market conditions and user-defined parameters.   

### Features
- **LLM Integration**: Leverages large language models to analyze market conditions and make informed
    trading decisions.
- **1inch Limit Orders**: Utilizes 1inch's limit order APIs to execute trades efficiently.
- **Grid Strategy**: Implements a grid trading strategy to capitalize on market fluctuations.

### Todo
- [ ] Add tenderly hooks to show the calls


## Setup

1. Clone the repository
2. Install dependencies
```
cd frontend
pnpm install
```
3. Create a `.env.local` file based on the [template](./frontend/env.example) and add environment variable values
4. Run the development server
```
pnpm run dev
```
