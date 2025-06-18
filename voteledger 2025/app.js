const contractAddress = "0xd2C1833b5fE068f96e038Bfdef4ee02001dbF0A3";
const contractABI = [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "addCandidate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "endDate",
				"type": "uint256"
			},
			{
				"internalType": "string[]",
				"name": "names",
				"type": "string[]"
			}
		],
		"name": "createSession",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "deleteCandidate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			}
		],
		"name": "deleteSession",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "candidateIndex",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getActiveSessions",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			}
		],
		"name": "getCandidates",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "names",
				"type": "string[]"
			},
			{
				"internalType": "uint256[]",
				"name": "votes",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			}
		],
		"name": "getSessionInfo",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "id",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "hasVoted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}


	

];
let contract;
let selectedCandidateId = null;

// Use a public Polygon mainnet RPC for read-only access
const polygonRpc = "https://polygon-rpc.com";

async function loadContract(readOnly = false) {
	let provider;
	if (!readOnly && window.ethereum) {
		provider = new ethers.providers.Web3Provider(window.ethereum);
		const signer = provider.getSigner();
		contract = new ethers.Contract(contractAddress, contractABI, signer);
	} else {
		provider = new ethers.providers.JsonRpcProvider(polygonRpc);
		contract = new ethers.Contract(contractAddress, contractABI, provider);
	}
}

async function connectWallet() {
	if (window.ethereum) {
		try {
			const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
			document.getElementById('account').textContent = accounts[0];

			// Update wallet status message
			document.getElementById('walletStatus').textContent = "Wallet Connected";

			await loadContract();

			const userAddress = accounts[0].toLowerCase();
			const isAdminPage = window.location.pathname.includes("admin");
			if (isAdminPage && userAddress !== "") {
				alert("❌ You are not authorized to access the admin panel.");
				window.location.href = "index.html";
				return;
			}

			// ✅ Load candidates if on voting page
			if (!isAdminPage && typeof loadCandidates === "function") {
				await loadCandidates();
			}
		} catch (error) {
			console.error("Wallet connection failed:", error);
			document.getElementById('walletStatus').textContent = "Failed to connect wallet";
		}
	} else {
		alert("Please install MetaMask!");
		document.getElementById('walletStatus').textContent = "MetaMask not installed";
	}
}

async function loadCandidates() {
	const tbody = document.getElementById("candidateTableBody");
	if (!tbody) return;
	tbody.innerHTML = "";

	const count = await contract.getCountCandidates();
	for (let i = 1; i <= count; i++) {
		const candidate = await contract.candidates(i);

		// ✅ Skip blank/deleted candidates
		if (!candidate.name || candidate.name.trim() === "") continue;

		const tr = document.createElement("tr");
		tr.innerHTML = `
			<td><input type="radio" name="candidate" value="${i}"></td>
			<td>${candidate.name}</td>
			<td>${candidate.voteCount}</td>
		`;
		tbody.appendChild(tr);
	}

	document.querySelectorAll('input[name="candidate"]').forEach(radio => {
		radio.addEventListener("change", function () {
			selectedCandidateId = parseInt(this.value);
		});
	});
}

async function deleteCandidate() {
	const idInput = document.getElementById("deleteCandidateId");
	const id = parseInt(idInput.value);

	if (isNaN(id) || id <= 0) {
		alert("❌ Please enter a valid candidate ID.");
		return;
	}

	try {
		const provider = new ethers.providers.Web3Provider(window.ethereum);
		const signer = provider.getSigner();
		const contract = new ethers.Contract(contractAddress, contractABI, signer);

		const tx = await contract.deleteCandidate(id);
		await tx.wait();

		alert(`✅ Candidate with ID ${id} deleted successfully!`);
		idInput.value = "";

		// ✅ Refresh the candidate list to remove row from UI
		await loadCandidates();

	} catch (error) {
		console.error("Delete failed:", error);
		alert("❌ Failed to delete candidate.\n" + (error?.reason || error?.message || "Unknown error"));
	}
}

async function addNewCandidate(name) {
	if (!name.trim()) return;
	const tx = await contract.addCandidate(name);
	await tx.wait();
}

async function setVotingEndDate() {
	const dateInput = document.getElementById('endDateInput')?.value;
	if (!dateInput) return;
	const unixTimestamp = Math.floor(new Date(dateInput).getTime() / 1000);
	const tx = await contract.setEndDate(unixTimestamp);
	await tx.wait();
}

async function castVote() {
	if (selectedCandidateId === null) return alert("Select a candidate first.");
	const tx = await contract.vote(selectedCandidateId);
	await tx.wait();
}

// Fetch all ongoing voting sessions and their details
async function getOngoingVotings() {
	// Try to use MetaMask if available, otherwise fallback to public RPC
	if (!contract) await loadContract(true);
	// 1. Get all active session IDs
	const sessionIds = await contract.getActiveSessions();
	let sessions = [];
	for (let i = 0; i < sessionIds.length; i++) {
		const id = sessionIds[i];
		// 2. Get session info (candidateCount, endDate)
		const [candidateCount, endDate] = await contract.getSessionInfo(id);
		// 3. Get candidate names and vote counts
		const [names, votes] = await contract.getCandidates(id);
		// 4. Build session object
		sessions.push({
			id,
			endDate: Number(endDate),
			candidates: names.map((name, idx) => ({
				name,
				voteCount: votes[idx].toString()
			}))
		});
	}
	return sessions;
}