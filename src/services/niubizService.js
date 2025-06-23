function niubizTransfer(amount) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (typeof amount !== 'number' || isNaN(amount)) {
                throw new Error('Invalid amount: must be a number');
            }
            const transactionId = `NIUBIZ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            console.log(`[Niubiz] Simulating transfer of S/ ${amount.toFixed(2)}. Transaction ID: ${transactionId}`);
            resolve(transactionId);
        }, 500); 
    });
}

module.exports = {
    niubizTransfer
};