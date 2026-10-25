-- 하이라이트 색상 선택·메모·X 메뉴에 맞춰 기존 안내만 갱신한다.
UPDATE memo.notice
SET body_ko = '글을 드래그하면 색상 선택 팝업이 떠요. 색상을 눌러 문장을 저장하고 메모도 남길 수 있어요. 저장한 문장은 웹에서 모아 볼 수 있어요. X 메뉴에서 위치를 바꾸거나 사이트별·전체 팝업을 끌 수 있어요.',
    body_en = 'Select text to open a color picker. Choose a color to save a passage or add a note, and find saved passages later on the web. Use the X menu to change the popup position or turn it off for this site or all sites.'
WHERE id = 1
  AND title_ko = '드래그하면 하이라이트 버튼이 떠요';
