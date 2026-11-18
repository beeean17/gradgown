-- Views. Design: docs/decisions/db-privileges.md

USE gradgown;

-- The announcements a student may read. The student account has SELECT on
-- this view and nothing on the announcements table, so a hidden announcement
-- cannot reach the student server at all.
--
-- SQL SECURITY DEFINER: the view reads the table with the privileges of the
-- account that created it (root, during container initialisation), not with
-- those of the account that queries it.
CREATE SQL SECURITY DEFINER VIEW visible_announcements AS
SELECT
  id,
  title,
  content,
  category,
  is_pinned,
  is_popup,
  popup_order,
  show_on_home,
  author_id,
  created_at,
  updated_at
FROM announcements
WHERE is_visible = TRUE;
