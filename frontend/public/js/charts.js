document.addEventListener('DOMContentLoaded', function () {
  const addressInput = document.querySelector('.address-input');
  let timelineChart = null;
  let fetchInterval = null; // store the interval reference

  // Automatically focus the contract address input field on page load
  addressInput.focus();

  // ---------------------------------------------------------
  // Show/Hide Loading Text for the chart
  // ---------------------------------------------------------
  function showChartLoadingIndicator(show) {
    const loadingEl = document.getElementById('chartLoading');
    if (loadingEl) {
      loadingEl.style.display = show ? 'block' : 'none';
    }
  }

  /* ------------------------------------------------------
   * 1) Event Listener: Contract Address Input
   *    Sends the address to Telegram via /sendContractAddress
   *    Resets any existing data on the server
   * ------------------------------------------------------ */
  addressInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const contractAddress = e.target.value.trim();
      if (!contractAddress) {
        console.warn('[WARN] Contract address is empty!');
        return;
      }
  
      console.log('[INFO] New contract address entered:', contractAddress);
      
      // Show the loading indicator
      showChartLoadingIndicator(true);
  
      try {
        // 1) Clear existing data on your backend
        await clearAPIData();
  
        // 2) Send the contract address to your Telegram bridge
        await sendContractAddressToBot(contractAddress);
  
        // 3) Once the address is sent, start fetching data
        //    (Also clear any previous intervals so we don't double-poll)
        if (fetchInterval) clearInterval(fetchInterval);
  
        // Immediately render chart once
        await renderSniperChart();
  
        // Then poll every 10 seconds
        fetchInterval = setInterval(renderSniperChart, 10_000);
      } catch (error) {
        console.error('[ERROR] Error in address input flow:', error);
      } finally {
        // Hide the loading indicator once everything is done
        showChartLoadingIndicator(false);
      }
    }
  });
  

  // ---------------------------------------------------------
  // 2) Functions to interact with your backend APIs
  // ---------------------------------------------------------
  async function clearAPIData() {
    try {
      const response = await fetch(
        // 'http://ec2-3-80-88-97.compute-1.amazonaws.com:3000/clearData',
        'http://localhost:3000/clearData',
        {
          method: 'POST',
        }
      );
      if (!response.ok) {
        throw new Error(
          `[ERROR] Failed to clear data. Status: ${response.status}`
        );
      }
      console.log('[INFO] API data cleared successfully.');
    } catch (error) {
      console.error('[ERROR] Error clearing API data:', error);
      throw error;
    }
  }

  async function sendContractAddressToBot(contractAddress) {
    try {
      const apiEndpoint =
        // 'http://ec2-3-80-88-97.compute-1.amazonaws.com:3001/sendContractAddress';
        'http://localhost:3001/sendContractAddress';


      console.log('[INFO] Sending contract address to bot:', contractAddress);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress }),
      });

      if (!response.ok) {
        throw new Error(
          `[ERROR] Failed to send contract address. Status: ${response.status}`
        );
      }
      console.log('[INFO] Contract address sent successfully:', contractAddress);
    } catch (error) {
      console.error('[ERROR] Failed to send contract address:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // 3) Sniper Analysis: Data Fetch, Parsing, & Chart Rendering
  // ---------------------------------------------------------
  async function fetchSniperData() {
    try {
      const response = await fetch(
        // 'http://ec2-3-80-88-97.compute-1.amazonaws.com:3000/fetchData'
        'http://localhost:3000/fetchData'
      );
      if (!response.ok) {
        throw new Error(`[Sniper] HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Sniper] Error fetching data:', error);
      return null;
    }
  }

  // Helper functions to parse data
  function extractSnipedPercent(line) {
    const match = line.match(/🔫(?: Sniped)?\s+([\d.]+)%/);
    return match ? parseFloat(match[1]) : null;
  }

  function extractHoldsPercent(line) {
    const match = line.match(/Holds\s+([\d.]+)%/);
    return match ? parseFloat(match[1]) : null;
  }

  function isEntityLine(line) {
    return (
      line.trim().startsWith('└👷') ||
      line.trim().startsWith('└ 👷') ||
      line.trim().startsWith('└ 👤') ||
      line.trim().startsWith('└ 🤖')
    );
  }

  function extractTimestampLabel(line) {
    const block0Match = line.match(/Block\s*(\d+)\s*Snipe/);
    if (block0Match) {
      return `Block ${block0Match[1]}`;
    }
    if (line.includes('⌚️')) {
      return line.replace('└ ⌚️', '').trim();
    }
    return null;
  }

  function getSecondsFromLabel(label) {
    if (label.includes('Block 0')) {
      return 0;
    }
    let minSecMatch = label.match(/(\d+)min\s*(\d*)sec?/);
    if (minSecMatch) {
      const minutes = parseInt(minSecMatch[1], 10) || 0;
      const seconds = parseInt(minSecMatch[2], 10) || 0;
      return minutes * 60 + seconds;
    }
    let secMatch = label.match(/(\d+)\s*sec/);
    if (secMatch) {
      return parseInt(secMatch[1], 10);
    }
    return 999999;
  }

  function parseSniperData(allTokens) {
    const tokenData = allTokens.find(
      (item) => item['🎯 Snipers & First Buyers'] || item['🛠 Deployer']
    );
    if (!tokenData) {
      console.warn('[Sniper] No relevant sniper data found.');
      return { labels: [], snipedValues: [], holdsValues: [] };
    }

    // 1) Developer info
    let devSniped = 0;
    let devHolds = 0;

    function parseDeveloperBlock(lines) {
      let capture = false;
      for (let line of lines) {
        if (isEntityLine(line)) {
          capture = line.includes('👷'); // only capture if "👷"
        } else if (capture) {
          const snipeVal = extractSnipedPercent(line);
          if (snipeVal !== null) devSniped = snipeVal;

          const holdVal = extractHoldsPercent(line);
          if (holdVal !== null) devHolds = holdVal;
        }
      }
    }

    const deployerLines = tokenData['🛠 Deployer'] || [];
    const sniperLines = tokenData['🎯 Snipers & First Buyers'] || [];
    parseDeveloperBlock(deployerLines);
    parseDeveloperBlock(sniperLines);

    // 2) Parse non-developer sniper blocks
    let participants = [];
    let currentEntity = null;
    let currentBlockLines = [];

    function finalizeBlock() {
      if (!currentEntity || !currentBlockLines.length) return;
      if (currentEntity.includes('👷')) return; // skip developer

      let timestampLabel = null;
      let sniped = null;
      let holds = 0;

      for (let line of currentBlockLines) {
        if (!timestampLabel) {
          const maybeTs = extractTimestampLabel(line);
          if (maybeTs) timestampLabel = maybeTs;
        }
        if (sniped === null) {
          const maybeSnipe = extractSnipedPercent(line);
          if (maybeSnipe !== null) sniped = maybeSnipe;
        }
        const maybeHold = extractHoldsPercent(line);
        if (maybeHold !== null) holds = maybeHold;
      }

      if (timestampLabel && sniped !== null) {
        const secs = getSecondsFromLabel(timestampLabel);
        // Example: only track up to 300s (5 min)
        if (secs <= 300) {
          participants.push({
            timestampLabel: secs + 's',
            sniped,
            holds,
          });
        }
      }
    }

    for (let line of sniperLines) {
      if (isEntityLine(line)) {
        finalizeBlock();
        currentEntity = line;
        currentBlockLines = [];
      } else if (currentEntity) {
        currentBlockLines.push(line);
      }
    }
    finalizeBlock();

    // 3) Build arrays
    let labels = ['Dev'];
    let snipedValues = [devSniped];
    let holdsValues = [devHolds];

    for (let p of participants) {
      labels.push(p.timestampLabel);
      snipedValues.push(p.sniped);
      holdsValues.push(p.holds);
    }

    return { labels, snipedValues, holdsValues };
  }

  function updateActiveSnipes() {
    const activeSnipesElement = document.getElementById('activeSnipersCount');
    const activeSnipersOutput = document.getElementById('activeSnipersOutput');
    if (!timelineChart) return;

    try {
      const holdsDataset = timelineChart.data?.datasets?.[0];
      if (!holdsDataset) {
        // Keep showing "Loading.." if there's no holds dataset
        if (activeSnipesElement) activeSnipesElement.textContent = 'Loading..';
        if (activeSnipersOutput) activeSnipersOutput.textContent = 'Loading..';
        return;
      }
      const activeCount = holdsDataset.data.filter((v) => v > 0).length;

      // Left column
      if (activeSnipesElement) activeSnipesElement.textContent = activeCount;
      // Right column
      if (activeSnipersOutput) activeSnipersOutput.textContent = activeCount;

      if (activeCount > 3) {
        if (activeSnipesElement) activeSnipesElement.classList.add('danger');
      } else {
        if (activeSnipesElement) activeSnipesElement.classList.remove('danger');
      }
    } catch (err) {
      console.error('[Sniper] Failed to update active snipes:', err);
      if (activeSnipesElement) activeSnipesElement.textContent = 'Loading..';
      if (activeSnipersOutput) activeSnipersOutput.textContent = 'Loading..';
    }
  }

  function updateTotalSnipes() {
    const totalHoldingElement = document.getElementById('totalHoldingValue');
    const totalHoldingOutput = document.getElementById('totalHoldingOutput');
    if (!timelineChart) return;

    try {
      const holdsDataset = timelineChart.data?.datasets?.[0];
      if (!holdsDataset) {
        // Keep showing "Loading.." if there's no holds dataset
        if (totalHoldingElement) totalHoldingElement.textContent = 'Loading..';
        if (totalHoldingOutput) totalHoldingOutput.textContent = 'Loading..';
        return;
      }
      let totalHolds = holdsDataset.data.reduce(
        (acc, val) => acc + (val || 0),
        0
      );

      // Left column
      if (totalHoldingElement) {
        totalHoldingElement.textContent = `${totalHolds.toFixed(3)}%`;
        if (totalHolds > 3) {
          totalHoldingElement.classList.add('danger');
        } else {
          totalHoldingElement.classList.remove('danger');
        }
      }

      // Right column
      if (totalHoldingOutput) {
        totalHoldingOutput.textContent = `${totalHolds.toFixed(3)}%`;
      }
    } catch (err) {
      console.error('[Sniper] Failed to update total holds:', err);
      if (totalHoldingElement) totalHoldingElement.textContent = 'Loading..';
      if (totalHoldingOutput) totalHoldingOutput.textContent = 'Loading..';
    }
  }

  async function renderSniperChart() {
    const timelineCtx = document.getElementById('timelineChart');
    if (!timelineCtx) {
      console.error('[Sniper] #timelineChart not found');
      return;
    }

    // Show loading text
    showChartLoadingIndicator(true);

    try {
      const rawData = await fetchSniperData();
      if (!rawData || !Array.isArray(rawData)) {
        throw new Error('[Sniper] No or invalid data from server');
      }

      // Once we have valid data, hide loading text
      showChartLoadingIndicator(false);

      const { labels, snipedValues, holdsValues } = parseSniperData(rawData);

      // Destroy old chart if it exists
      if (timelineChart instanceof Chart) {
        timelineChart.destroy();
      }

      timelineChart = new Chart(timelineCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Active',
              data: holdsValues,
              backgroundColor: 'rgba(255, 0, 0, 0.8)',
              maxBarThickness: 30,
              stack: 'sniperStack',
            },
            {
              label: 'Sold',
              data: snipedValues,
              backgroundColor: 'rgba(128, 128, 128, 1)',
              maxBarThickness: 30,
              stack: 'sniperStack',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) label += ': ';
                  if (context.raw !== null) {
                    label += `${context.raw}%`;
                  }
                  return label;
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              beginAtZero: true,
              stacked: true,
              ticks: {
                callback: function (value) {
                  return value + '%';
                },
              },
            },
          },
        },
      });

      // Update stats (left column + right column)
      updateTotalSnipes();
      updateActiveSnipes();
    } catch (error) {
      console.error('[Sniper] Error rendering chart:', error);
      // Keep the loading indicator visible until valid data is fetched
    }
  }
});
