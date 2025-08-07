+---------------------+         +---------------------+         +---------------------+
|  Educator/Content   |         |   LLM (with RAG)    |         |     Database        |
|    Authoring Tool   |         |                     |         |   (Activities &     |
| (Write Prompt &     |         | (Generates JS       |         |    Functions)       |
|  Criteria)          |         |  Validation Logic)  |         |                     |
+----------+----------+         +----------+----------+         +----------+----------+
           |                               |                               |
           | 1. Prompt & Criteria           |                               |
           +------------------------------->|                               |
           |                                |                               |
           |                                | 2. Generates:                 |
           |                                |    - Activity Config          |
           |                                |    - evaluate() function      |
           |                                |    - feedbackFunction()       |
           |                                +-----------------------------> |
           |                                |                               |
           |                                | 3. Store Activity             |
           |                                |   & Functions                 |
           |                                |                               |
           |                                |                               |
           |                                |                               |
           v                                v                               v

+-----------------------------------------------------------------------------------+
|                                   Student App                                     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
| 4. Fetch Activity (Prompt, UI Config, Functions)                                  |
|                                                                                   |
| +-------------------+                                                             |
| |  Display Prompt   |                                                             |
| |  & Interactive UI | <----------------------------------------------------------+
| +-------------------+                                                             |
|         |                                                                         |
|         | 5. Student Interacts (inputs/taps/selects)                              |
|         v                                                                         |
| +-------------------+                                                             |
| |  Submit Answer    |                                                             |
| +-------------------+                                                             |
|         |                                                                         |
|         | 6. Run evaluate() function                                              |
|         v                                                                         |
| +-------------------+                                                             |
| |  Validation       |                                                             |
| +-------------------+                                                             |
|         |                                                                         |
|         | 7. Run feedbackFunction()                                               |
|         v                                                                         |
| +-------------------+                                                             |
| |  Feedback (audio/ |                                                             |
| |  visual/hints)    |                                                             |
| +-------------------+                                                             |
|         |                                                                         |
|         | 8. Record Attempt & Progress                                            |
|         v                                                                         |
| +-------------------+                                                             |
| |  Next Activity or |                                                             |
| |  Retry            |                                                             |
| +-------------------+                                                             |
+-----------------------------------------------------------------------------------+