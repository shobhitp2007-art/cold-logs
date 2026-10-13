/*
 * COLD LOGS / Case HS26-IR-014
 * Source-grounded case data from all twenty-five supplied files.
 * No culprit or answer key is shipped here.
 */
window.COLD_LOGS_CASE = {
  id: "HS26-IR-014",
  title: "The Stolen Hackathon Prototype",
  eyebrow: "CASE HS26-IR-014 / CYBERCRIME INVESTIGATION",
  status: "LIVE INVESTIGATION · FICTIONAL EXERCISE",
  timeLimitSeconds: 35 * 60,
  brief: "Team LumenPath says its unreleased night-safe walking route planner appeared in a competing team's HackSprint 2026 teaser. Examine the supplied records, reconstruct what happened, and submit a reasoned report. Treat every claim as a hypothesis until the records connect it.",
  objectives: [
    "Reconstruct the event sequence",
    "Trace the copy and access path",
    "Separate evidence from inference",
    "Cite filenames + timestamps or record IDs"
  ],
  handbook: [
    {
      id: "HANDBOOK-01",
      title: "Participant Brief",
      description: "Role, objective, evidence standard, rules, and 35-minute time limit.",
      href: "handbook/Participant_Brief.pdf",
      format: "pdf"
    },
    {
      id: "HANDBOOK-02",
      title: "Investigation Questions",
      description: "All 11 final questions and the two checkpoint prompts.",
      href: "handbook/Investigation_Questions.pdf",
      format: "pdf"
    }
  ],
  rounds: [
    {
      id: "round1",
      number: "01",
      title: "Initial Incident Pack",
      subtitle: "Folder 01 · Exhibits 01-1 to 01-4",
      unlockAfter: "start",
      description: "Establish what was reported, who had access, what similarities were observed, and what the interviews claim. These records do not, by themselves, prove who transferred the copy.",
      evidence: [
        {
          id: "EXHIBIT-01-1",
          title: "Incident Report HS26-IR-014",
          sourceName: "incident_report_HS26-IR-014.pdf",
          stamp: "Filed 19 Nov 2026 · 15:00 IST",
          description: "Committee's initial incident summary, records collected, and the pre-existing USB-write alert EPA-2217.",
          href: "evidence/round-1/incident_report_HS26-IR-014.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-01-2",
          title: "Repository Access Roster",
          sourceName: "repository_access_roster.pdf",
          stamp: "Admin export · 18 Nov 2026 12:00 IST",
          description: "Lists the five accounts with legitimate access, their permissions, and CI token lp-ci-token-02.",
          href: "evidence/round-1/repository_access_roster.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-01-3",
          title: "Judge Comparison Notes",
          sourceName: "judge_comparison_notes.pdf",
          stamp: "19 Nov 2026 · 09:30 IST",
          description: "Records code/data similarities between NimbusNav and LumenPath, alongside the judge's caution about attribution.",
          href: "evidence/round-1/judge_comparison_notes.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-01-4",
          title: "Interview Statements Summary",
          sourceName: "interview_statements_summary.pdf",
          stamp: "Interviews · 20 Nov 2026 09:00–11:30 IST",
          description: "Summaries what the four students and faculty mentor said. The document explicitly labels these as unverified statements.",
          href: "evidence/round-1/interview_statements_summary.pdf",
          format: "pdf"
        }
      ],
      checkpoint: {
        id: "checkpoint1",
        title: "Checkpoint 1 — First Hypothesis",
        intro: "Write a provisional assessment using Round 1 only. Keep alternative theories open and distinguish observations from assumptions.",
        prompts: [
          { id: "cp1a", prompt: "How might the copy have reached Team Nimbus, and when?", help: "State a provisional explanation; anchor it to the records you have so far.", maxLength: 1000 },
          { id: "cp1b", prompt: "Which theories and suspects are still open?", help: "Do not treat access or motive alone as proof.", maxLength: 1000 },
          { id: "cp1c", prompt: "Which records point toward the USB drive, and which point elsewhere?", help: "Name the filenames and timestamps or record IDs that support each side.", maxLength: 1400 }
        ]
      }
    },
    {
      id: "round2",
      number: "02",
      title: "Messages & Technical Audit",
      subtitle: "Folders 02–05 · communications, repository, endpoint & transfer records",
      unlockAfter: "checkpoint1",
      description: "Correlate the messages with repository, session, build, endpoint, gateway, USB, campus-access, and leaked-package records. Each source proves a different part of the chain. Separate technical identifiers from the person who may have operated them.",
      evidence: [
        {
          id: "EXHIBIT-02-1",
          title: "Mentor Email Thread",
          sourceName: "mentor_email_thread.pdf",
          stamp: "Provided by Aarav · 19 Nov 2026",
          description: "Email exchange about the mentor's declared advising role, read-only access, clone, and dashboard review.",
          href: "evidence/round-2/mentor_email_thread.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-02-2",
          title: "Forwarded Email — Unknown Sender",
          sourceName: "forwarded_email_unknown_sender.pdf",
          stamp: "Forwarded 19 Nov 2026 · 14:35 IST",
          description: "An email from the campus alias 'Lantern' with a SendBox link, followed by Nimbus lead Ishaan's reply.",
          href: "evidence/round-2/forwarded_email_unknown_sender.pdf",
          format: "pdf"
        },
        {
          id: "CHAT-02-A",
          title: "Kabir ↔ Tanvi Direct Chat",
          sourceName: "kabir_tanvi_direct_chat.txt",
          stamp: "16–18 Nov 2026 · IST",
          description: "Direct messages about public slides, a poster template, the USB copy, and the later Lantern message.",
          href: "evidence/round-2/kabir_tanvi_direct_chat.txt",
          format: "text"
        },
        {
          id: "CHAT-02-B",
          title: "Team LumenPath Group Chat",
          sourceName: "team_group_chat_lumenpath.txt",
          stamp: "15–18 Nov 2026 · IST",
          description: "Team messages about the shared CI token, the heatmap decision, local backups, USB copying, the merge, and the export notification.",
          href: "evidence/round-2/team_group_chat_lumenpath.txt",
          format: "text"
        },
        {
          id: "EXHIBIT-03-1",
          title: "Repository Audit — Commit History",
          sourceName: "commit_history.pdf",
          stamp: "Exported by BCE IT · 19 Nov 2026 · IST",
          description: "Commit timestamps, branch history, file-version hashes, and working-tree file counts for key repository revisions.",
          href: "evidence/round-2/commit_history.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-03-2",
          title: "Repository Audit — Web/API Session History",
          sourceName: "account_session_history.pdf",
          stamp: "Exported · 19 Nov 2026 · IST",
          description: "Browser sessions with account, device, source IP, and authentication method. The document distinguishes browser sessions from API-token requests.",
          href: "evidence/round-2/account_session_history.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-03-3",
          title: "Repository Clones & Archive Exports",
          sourceName: "download_manifest.pdf",
          stamp: "Repository audit · 12–17 Nov 2026",
          description: "Clone and export records, including export IDs, repository heads, byte sizes, hash prefixes, and the API-token export record.",
          href: "evidence/round-2/download_manifest.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-03-4",
          title: "CI Build Log — Nightly Job",
          sourceName: "ci_build_log.pdf",
          stamp: "CI-RUNNER-01 · 14–18 Nov 2026",
          description: "Scheduled build/export history, commit heads, archive sizes, hashes, and whether the nightly jobs passed.",
          href: "evidence/round-2/ci_build_log.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-03-5",
          title: "LumenPath Published / Shared Artifacts",
          sourceName: "release_artifact_inventory.pdf",
          stamp: "Compiled by BCE IT · 19 Nov 2026",
          description: "Describes the public v0.6 preview and pitch slides, their contents, and which private source/weight files are absent from the preview.",
          href: "evidence/round-2/release_artifact_inventory.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-04-1",
          title: "Endpoint Monitor — LAB-PC-14",
          sourceName: "usb_connection_events.pdf",
          stamp: "Endpoint records · 17 Nov 2026 · IST",
          description: "Logon, repository clone, USB connection, file-copy, alert, and disconnect events from the lab endpoint.",
          href: "evidence/round-2/usb_connection_events.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-04-2",
          title: "IT Inspection — USB Drive File Manifest",
          sourceName: "usb_drive_file_manifest.pdf",
          stamp: "Read-only inspection · 19 Nov 2026 · 16:10 IST",
          description: "Lists files found on the submitted USB drive and selected hash prefixes, including files that were not present.",
          href: "evidence/round-2/usb_drive_file_manifest.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-04-3",
          title: "Campus Web Gateway — Transfer Log",
          sourceName: "web_gateway_transfer_log.pdf",
          stamp: "Gateway extract · 17–18 Nov 2026 · IST",
          description: "External file-sharing and campus alias-service events with source IPs, object names, byte counts, and DLP hash prefixes.",
          href: "evidence/round-2/web_gateway_transfer_log.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-05-1",
          title: "IT Analysis — Team Nimbus Submission Package",
          sourceName: "leaked_package_file_manifest.pdf",
          stamp: "Nimbus submission · 18 Nov 2026 · 09:40 IST",
          description: "Compares the submitted package's file count and hash prefixes with repository versions while noting files later edited by Nimbus.",
          href: "evidence/round-2/leaked_package_file_manifest.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-05-3",
          title: "Campus Access & Wi-Fi Records",
          sourceName: "campus_access_and_wifi_records.pdf",
          stamp: "Campus Security + IT · 17–18 Nov 2026 · IST",
          description: "Card-reader events and Wi-Fi device associations. The source itself warns that card and device logs do not automatically identify the person present.",
          href: "evidence/round-2/campus_access_and_wifi_records.pdf",
          format: "pdf"
        }
      ],
      checkpoint: {
        id: "checkpoint2",
        title: "Checkpoint 2 — Correlate the Clues",
        intro: "Revise your working theory by correlating communications with repository, export, endpoint, gateway, USB, campus-access, and package records. A technical link may be provable even when the person behind an account or device remains uncertain.",
        prompts: [
          { id: "cp2a", prompt: "Which export or download created the copy that was leaked?", help: "Compare export IDs, repository heads, byte sizes, and hash prefixes across the repository, gateway, and submitted-package records. State any remaining gap.", maxLength: 1200 },
          { id: "cp2b", prompt: "Which account or token, and which IP address, are involved?", help: "Use the API export, source IP, session/device caveat, alias message, and campus records. Separate direct observations from attribution inferences.", maxLength: 1200 },
          { id: "cp2c", prompt: "Is the USB drive still a serious candidate? Why or why not?", help: "Compare the USB copy time and file manifest against the transfer log and Nimbus package hashes. Address both support and contradictions.", maxLength: 1200 }
        ]
      }
    },
    {
      id: "round3",
      number: "03",
      title: "Recovered Stamp & Attribution Records",
      subtitle: "Late evidence · device leases, alias audit, recovered archive stamp & Nimbus statements",
      unlockAfter: "checkpoint2",
      description: "Use the final evidence pack to connect the archive stamp and alias activity to the transfer chain. Check address reuse and device-registration caveats before attributing activity to a person. Then submit the final report using the original 11 questions.",
      evidence: [
        {
          id: "EXHIBIT-05-2",
          title: "Campus Network — Device Registry & DHCP Leases",
          sourceName: "network_lease_and_device_registry.pdf",
          stamp: "BCE IT NAC / DHCP · Exported 19 Nov 2026 · IST",
          description: "Maps device registration labels and selected DHCP lease windows to IP addresses. The record warns that registration is not proof of who was using a device, and that addresses are reused.",
          href: "evidence/round-3/network_lease_and_device_registry.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-06-1",
          title: "Recovered File — EXPORT_STAMP.txt",
          sourceName: "recovered_export_stamp_file.pdf",
          stamp: "Recovered from Nimbus repository commit a91c3f0 · 18 Nov 2026",
          description: "Shows the platform-generated archive export stamp recovered from the first Nimbus commit, including export ID, source repository, commit, token, request time, client and source IP.",
          href: "evidence/round-3/recovered_export_stamp_file.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-06-2",
          title: "Campus Alias Service — Audit Export",
          sourceName: "campus_alias_service_log.pdf",
          stamp: "BCE Campus Alias Service v1.4 · 17–18 Nov 2026",
          description: "Records creation and use of quiet.lantern92, including a link sent to Ishaan and a later inbox read. Alias creation uses SMS verification and does not require a campus login.",
          href: "evidence/round-3/campus_alias_service_log.pdf",
          format: "pdf"
        },
        {
          id: "EXHIBIT-06-3",
          title: "Statement of Ishaan Rane — Team Nimbus Lead",
          sourceName: "nimbus_cooperation_statement.pdf",
          stamp: "Statement taken 19 Nov 2026 · 14:20 IST",
          description: "A summary of what the Nimbus lead said about the Lantern email, download in Hostel D, import into Nimbus's repository, edits to the submission, and his claimed knowledge of the sender.",
          href: "evidence/round-3/nimbus_cooperation_statement.pdf",
          format: "pdf"
        },
        {
          id: "CHAT-06-A",
          title: "Team Nimbus — Group Chat Extract",
          sourceName: "nimbus_team_chat.txt",
          stamp: "18 Nov 2026 · IST",
          description: "Messages about receiving the archive, importing the code, renaming strings before submission, and when teammates say they learned the origin of the code.",
          href: "evidence/round-3/nimbus_team_chat.txt",
          format: "text"
        }
      ]
    }
  ],
  finalQuestions: [
    { id: "q1", prompt: "What most likely happened?", help: "Answer in 2–3 sentences. Cite key evidence.", maxLength: 1500 },
    { id: "q2", prompt: "Who is responsible?", help: "Explain whether the evidence identifies a person, account, token, device, or session—and how confidently.", maxLength: 1500 },
    { id: "q3", prompt: "How was the prototype transferred, from the repository to Team Nimbus?", help: "Describe the supported transfer path and its evidence.", maxLength: 1800 },
    { id: "q4", prompt: "Which account, device, or session was involved? What can you prove and what are you inferring?", help: "Keep identity attribution separate from technical identifiers.", maxLength: 1800 },
    { id: "q5", prompt: "Give the event timeline, from the first relevant event to Nimbus's first commit.", help: "Use key times in IST and cite a filename plus timestamp or record ID for each important step.", maxLength: 2600 },
    { id: "q6", prompt: "Which records support your conclusion?", help: "Provide filenames plus timestamps or record IDs. Do not list records without explaining what each supports.", maxLength: 2600 },
    { id: "q7", prompt: "Does the USB-drive evidence prove how the leak happened? Explain.", help: "Assess what the USB record establishes and whether it connects to the copy received by Nimbus.", maxLength: 1800 },
    { id: "q8", prompt: "Which other suspects can you eliminate, and why for each?", help: "Use evidence-based elimination. If someone cannot be ruled out, say so.", maxLength: 2200 },
    { id: "q9", prompt: "Which records are misleading, routine, or irrelevant? Why do they look suspicious, and what explains them?", help: "Explain how the apparent clue is contextualized by other records.", maxLength: 2400 },
    { id: "q10", prompt: "What is the strongest alternative explanation, and why do you reject it?", help: "Present the fairest alternative, then compare it with the evidence.", maxLength: 1800 },
    { id: "q11", prompt: "If uncertainty remains, what additional evidence would you request?", help: "Request specific records or tests that would resolve a named uncertainty.", maxLength: 1600 }
  ]
};
