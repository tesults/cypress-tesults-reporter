describe('Cypress Tesults reporter', () => {
    it('reports a passing test with a screenshot', () => {
        cy.wrap(2 + 2).should('equal', 4);
        cy.screenshot('passing-test');
    });

    it.skip('reports a pending test');
});
