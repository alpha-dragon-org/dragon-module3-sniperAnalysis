# Intro to Dragon's Modules

Dragon is a companion that visualizes the concentrations in power for any token on the Solana blockchain. The extension is separated into modules that provide different analyses on a token. Soon, developers will contribute their own modules to Dragon based on what they think is important for traders to know in the trenches.

The initial release includes four modules and the module for this bounty is:

**3. Sniper Analysis** 
- This module displays an overview of all wallets that bought token supply `A) within 15s of the creation of its first liquidity pool` OR `B) within 5s of its graduation from Pump.fun to Raydium`. The specific data to be retrieved includes total active snipers, % of sniped supply still active, timestamps per snipe, and more. The definition of a snipe will evolve from here later, but if a developer wishes to discuss it now, we are open to that discussion.
  
---

## Table of Contents

- [Intro to Dragon's Modules](#intro-to-dragons-modules)
- [Table of Contents](#table-of-contents)
  - [Contribution Overview](#contribution-overview)
  - [Folder Structure](#folder-structure)
  - [Setup \& Installation](#setup--installation)
  - [Module Details](#module-details)
  - [Bounty Selection Criteria](#bounty-selection-criteria)
  - [Integrating RPCs For Data Retrieval](#integrating-rpcs-for-data-retrieval)
  - [Contributing](#contributing)
  - [Future Bounties](#future-bounties)
  - [Issues](#issues)
  - [License](#license)

---

## Contribution Overview

This module currently gathers data by web-scraping TrenchyBot. The task is to build a pipeline that connects this module to a Solana RPC (eg. [Helius](https://www.helius.dev)) and replace all scrapes if possible. If any data can not be retrieved from RPC, the developer can use whatever means necessary given the goals stated in the [Module Details](#module-details) below.

If the data retrieved is as close to real-time as possible, Dragon becomes an unbeatable companion in the trenches.

---

## Folder Structure


```
dragon-data-modules/
├── package.json             # Project metadata and node dependencies
├── README.md                # This file
├── src
│   ├── api
│   │   └── server.js        # Express API server for data storage and retrieval which connects to the endpoints
│   ├── config
│   │   └── config.js        # Configuration file (ports, API keys, RPC endpoint)
│   ├── modules
│   │   ├── bundleAnalysis.js   # Module for Bundle Analysis
│   │   ├── clusterAnalysis.js  # Module for Cluster Analysis
│   │   ├── tokenInfo.js        # Module for Token Info
│   │   └── sniperAnalysis.js   # Module for Sniper Analysis
│   ├── telegram
│   │   └── telegramClient.js   # Telegram API integration & message processing which is used for tokenInfo.js and sniperAnalysis.js 
│   └── utils
│       ├── apiUtils.js         # Utility functions for API communication
│       └── telegramUtils.js    # Utility functions for parsing Telegram messages
│
└── frontend                  # Frontend code for the developer to test the backend
    ├── node_modules
    ├── public                # Contains static assets like images and stylesheets
    │   ├── css
    │   │   └── styles.css    
    │   ├── images
    │   └── js
    │       ├── chart2.js
    │       ├── charts.js    # Contains the frontend logic and connection requests to the backend 
    │       └── sidepanel.js
    ├── lib
    │   ├── fontawesome
    │   ├── chart.js
    │   └── vis-network.min.js
    ├── index.html           # The main entry point of the frontend, to all scripts and server
    ├── package-lock.json
    ├── package.json         # Manage dependencies and configurations for frontend
    └── server.js            # A backend entry point or middleware for API interaction

```

---

## Setup & Installation

1. **Clone the repository.**

   ```bash
   git clone https://github.com/alpha-dragon-org/dragon-module3-sniperAnalysis.git
   cd dragon-module3-sniperAnalysis
   ```

2. **Install dependencies.**

   Install all required Node.js packages by running:

   ```bash
   npm install
   ```

3. **Configure the application.**

   Open `src/config/config.js` and update the following parameters as needed:

   - `API_SERVER_PORT` and `TELEGRAM_SERVER_PORT`: Set the ports for the API and Telegram servers.
   - `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`: Replace with your Telegram API credentials.
   - `HELIUS_RPC_URL`: Update with your Helius RPC endpoint and API key, or replace with another RPC service's of your choice. This endpoint is used for blockchain data queries.

4. **Run the servers.**

   Start the API server in one terminal:

   ```bash
   npm start
   ```

   And then start the Telegram client (which also includes a small Express server) in another terminal:

   ```bash
   npm run telegram
   ```
5. **View results on frontend.**
   
   Start the API server to fetch data from backend:

   ```bash
   cd frontend
   npm install
   npm start
   ```   

   View results on:

   ```bash
   http://localhost:8080/
   ```



---

## Module Details

- **Module Name:** Sniper Analysis  
- **Bounty:** 0.10% of $DRAGON supply  
- **Goals:** Retrieve all data below in real-time and with extremely high accuracy.


### Data To Fetch

- **Total % active in snipes**  
  The total amount of token supply held in all sniper wallets.  
 **Example Output:** `18.3`

- **Total # of active snipers**  
  The total number of wallets that bought supply within either of the two [defined boundaries](#intro-to-dragon-data-modules), and are still holding any amount.  
  **Example Output:** `2`

- **Metadata for each active snipe**

  - **% active in snipe**  
  The amount of token supply actively held in the snipe. There may be multiple values to fetch, depending on the total # of active snipers.  
  **Example Output:** `7.2`

  - **% total in snipe**  
  The amount of token supply that was initially bought with the snipe. There may be multiple values to fetch, depending on the total # of active snipers.  
  **Example Output:** `7.2`

  - **Timestamp of snipe**  
  The exact number of seconds that the buy was made, relative to either one of the two [defined boundaries](#intro-to-dragon-data-modules). There may be multiple values to fetch, depending on the total # of active snipers.  
  **Example Output:** `4s`

- **Total # of inactive snipers**  
  The total number of wallets that bought supply within either of the two [defined boundaries](#intro-to-dragon-data-modules) and are no longer holding any amount, ie. sold to 0%  
  **Example Output:** `7`

- **Metadata for each inactive snipe**

  - **% total in snipe**  
  The amount of token supply that was initially bought with the snipe. There may be multiple values to fetch, depending on the total # of inactive snipers.  
  **Example Output:** `0.6`

   - **Timestamp of snipe**  
  The exact number of seconds that the buy was made, relative to either one of the two [defined boundaries](#intro-to-dragon-data-modules). There may be multiple values to fetch, depending on the total # of inactive snipers.  
  **Example Output:** `2s`

### Module Output

We have included a testing environment where you can see your code displayed live in the module. The test module will be interactive, meaning you can hover to reveal the metadata per snipe. *Note:* The module output may only display active snipes.

---

## Bounty Selection Criteria

We will select a recipient for this bounty based on the following criteria, in order of evaluation:

1. A fully complete retrieval of the data outlined in [Module Details](#module-details)
2. Closest to 100% accuracy for all data retrieved
3. Closest to immediate for data retrieval, and updated in real-time
4. Most comprehensive documentation of the work in accompanying readme file
   
If there is more than one developer to satisfy the above criteria, the first pull request will receive the bounty. 

**Please make sure to include your wallet address in your documentation and apply to [this job](https://www.based.jobs/) on based.jobs using that same wallet. This is where we will award the bounty to the winning developer.**

---

## Integrating RPCs for Data Retrieval

[Helius](https://www.helius.dev) is an example of an RPC service that enables quick and direct access to on-chain data on Solana. By integrating RPCs into Dragon's data-modules, we can **replace slow web-scraping techniques** and **increase data accuracy.** 

**How to update the code (with Helius)**
- **Modify the stub functions:** In files like `src/modules/tokenInfo.js` and `src/api/server.js`, update the stub implementations to call the appropriate Helius RPC endpoints.
- **Leverage the configured endpoints:** Use the `HELIUS_RPC_URL` from `src/config/config.js` to ensure that your RPC calls are directed to the correct endpoint with your API key.
- **Improve performance:** Integrate batching of RPC calls if necessary to further improve response time.

*Note:* If any data can not be retrieved from RPC, or if data can be faster retrieved via another method such as data streams, the developer can implement the alternative method with a brief explanation for their choice.

---

## Contributing

1. **Fork the repository.**

2. **Create a feature branch.**

   ```bash
   git checkout -b feature/updated-module
   ```

3. **Replace** `server.js`, `tokenInfo.js`, `apiUtils.js`, **and** `telegramUtils.js` **with your stub functions.**


4. **Commit your changes.**

   ```bash
   git commit -am 'Add updated module for XYZ'
   ```

5. **Push the branch.**

   ```bash
   git push origin feature/updated-module
   ```

6. **Open a pull request describing your changes and the code you have contributed.**
   
---

## Future Bounties

Dragon’s aim is to make token analyses more transparent and community-driven. At the community's direction, bounties will expand to include all kinds of fundamental token analyses.

If you have an idea for a module that could benefit traders in the trenches, please propose it in the discussion [here](https://github.com/orgs/alpha-dragon-org/discussions) to be considered for a bounty.

---
## Issues

Please report any bugs with this module through the issues tab here: [github.com/alpha-dragon-org/dragon-module3-sniperAnalysis](https://github.com/alpha-dragon-org/dragon-module3-sniperAnalysis)

---
## License

This project is open source and available under [the MIT License](https://opensource.org/license/mit).

---
<img src="https://github.com/alpha-dragon-org/dragon-module1-tokeninfo/blob/main/frontend/logo-d.gif?raw=true" width="150">

[X](https://x.com/AlphaDragonAI) |
[Discussion](https://github.com/orgs/alpha-dragon-org/discussions) |
[Telegram](https://t.me/+OU0SLVfcpEZhZWQx)

https://github.com/user-attachments/assets/7cd467df-3751-4be8-a710-2b8466ecf084
