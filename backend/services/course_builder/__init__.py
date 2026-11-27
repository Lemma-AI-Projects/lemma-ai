"""Course builder (建课流程): one sentence + course settings -> questionnaire
-> knowledge map -> map check -> syllabus -> review and confirm. Designed and
implemented in round three; this package only marks its place.

It is the one new package allowed to call AI, and only through ai_client
(prompts live in ai/prompts/templates/). It never calls AI inside a
transaction scope.

Entries it will call:
- course library: create_course, write_qa_pairs, check_knowledge_map,
  write_knowledge_map, check_syllabus, write_syllabus, confirm_course;
  get_course, get_knowledge_map, get_syllabus;
- course scheduler: save_plan, get_plan, preview, place_into_schedule.

It does not touch the schedule book or the rules layer directly. Its own
product rules (points per volume, every point has an edge, lessons per unit,
questionnaire counts) read services/product_params.py's COURSE_BUILDER
section.
"""
