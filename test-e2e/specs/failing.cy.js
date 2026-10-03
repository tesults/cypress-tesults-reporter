describe('Cypress Tesults reporter failure', () => {
    it('reports an intentional failure', () => {
        expect(2 + 2).to.equal(5);
    });
});
