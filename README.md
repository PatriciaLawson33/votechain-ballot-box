# VoteChain Ballot

Encrypted MVP rating system powered by Zama's FHEVM.

## Features

- **Encrypted Voting**: Homomorphically encrypted ratings (1-11 points)
- **Decentralized**: Smart contracts on Ethereum-compatible networks
- **Modern UI**: React-based interface with wallet integration

## Quick Start

```bash
npm install
npm run compile
npm run test
```

## Development

### Backend (Contracts)
```bash
npx hardhat compile
npx hardhat test
npx hardhat deploy --network localhost
```

### Frontend (UI)
```bash
cd frontend
npm install
npm run dev
```

## Deployment

- **Local**: `npx hardhat node`
- **Testnet**: Sepolia network
- **Production**: [Vercel](https://votechain-seven.vercel.app/)

## Demo Video

Watch the demo video: [votechain.mp4](https://github.com/PatriciaLawson33/votechain-ballot-box/raw/main/votechain.mp4)

## License

BSD-3-Clause-Clear
