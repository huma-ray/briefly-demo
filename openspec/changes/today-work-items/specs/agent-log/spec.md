## ADDED Requirements

### Requirement: Sample runs are labelled
Runs created for a new sandbox's sample history and opening briefing SHALL be recorded with model `sample` or `briefing`, zero cost, and SHALL NOT count toward the visitor's daily request limit.

#### Scenario: Limit unaffected
- **WHEN** a new visitor with eight sample and briefing runs sends their first question
- **THEN** it is counted as request 1 of 20
