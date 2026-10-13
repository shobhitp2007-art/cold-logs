# Cold Logs — Digital Investigation Platform

**Cold Logs** is a web-based login portal for a digital investigation game. It gives registered teams a single entry point before they move into investigation activities. The current work focuses on the login experience, Supabase authentication, and a distinctive black-and-yellow interface.

> **Tagline:** No clue left behind.

## Project Status

The login page and its front-end authentication flow have been implemented. The page includes team ID and password fields, basic input validation, show/hide password, an option to remember the team ID, status/error messages, and a redirect after a successful login. The investigation dashboard and end-to-end event flow should be tested and completed as part of the next development stage.

## Current Features

- **Team login:** accepts team IDs in the `TEAM-001` format.
- **Supabase Auth:** checks credentials using Supabase password authentication.
- **Input validation:** checks that required fields are filled and that the team ID follows the expected format.
- **Show/hide password:** lets a team member reveal or mask the password while entering it.
- **Remember team ID:** stores only the team ID in browser local storage; it does not store the password.
- **Login feedback:** displays validation messages, access errors, and a success message.
- **Responsive layout:** adapts the login page for desktop and mobile screens.
- **Visual design:** uses a black-and-yellow forensic theme, a custom text-based `C/L.` mark, animated orbital rings, and subtle background effects.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and login form |
| CSS3 | Layout, responsive styling, colours, and animations |
| JavaScript | Validation, password toggle, remembered team ID, and login flow |
| Supabase Auth | Credential verification |
| Vercel | Static website hosting and deployment |
| GitHub | Source control and deployment integration |

## Project Structure

```text
cold-logs/
├── index.html       # Login page markup
├── style.css        # Theme, layout, responsiveness, and animations
├── script.js        # Validation and Supabase login logic
├── dashboard.html   # Destination after successful login (must be present)
└── README.md        # Project documentation
```


## How the Login Works

1. A team enters its ID and password on the login page.
2. JavaScript trims the team ID, converts it to uppercase, and checks that the required values are present.
3. The team ID is used to construct the corresponding Supabase Auth email in this format: `team-001@coldlogs.event`.
4. Supabase Auth verifies the credentials.
5. If authentication succeeds, the page displays a success message and redirects to `dashboard.html`.
6. If authentication fails, the page displays an error and allows the user to try again.

The front-end checks the ID format (`TEAM-` followed by three digits). The valid team range and access permissions must also be controlled through team provisioning and the authentication/backend configuration; the format check alone is not an authorization rule.


## Security Notes

This project currently uses browser-side Supabase Auth for login. Client-side validation improves usability but must not be treated as the only security control. Access to protected data and investigation actions should be enforced by Supabase Auth and appropriate backend/database policies.

## License

No license has been specified yet. Add a `LICENSE` file if you intend to publish or reuse this project under a particular open-source license.

---

**Cold Logs** · *Digital Investigation Platform* · *No clue left behind.*

