describe('Cypress Tesults reporter', () => {
    it('reports a passing test with a screenshot', () => {
        cy.visit('data:text/html,<title>Cypress Action</title><h1>Ready</h1>');
        cy.title().should('equal', 'Cypress Action');
        cy.screenshot('passing-test');
    });

    it.skip('reports a pending test');
});
