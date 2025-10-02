import { useState } from 'react';
import ReactRotatingText from 'react-rotating-text';

import { Author } from '@/src/type';

// import Image from '../Image';
import * as S from './styled';

type MainBannerProps = {
  author: Author;
};

const MainBanner: React.FC<MainBannerProps> = ({ author }) => {
  const { stack, social, name, nickname, dropdown } = author;

  const [isDropdownOpened, setIsDropdownOpened] = useState(false);

  return (
    <S.Wrapper>
      <S.IntroWrapper>
        <S.Title>
          안녕하세요!
          <br />
          프론트엔드 개발자 <br />
          <strong>
            이지훈
          </strong>
          입니다.
          {/* <Image alt='thumbnail' src='thumbnail.jpeg' /> */}
        </S.Title>

        <S.SocialWrapper>
          {Object.keys(social).map(
            (link, index) =>
              social[link as keyof typeof social] && (
                <S.SocialButton key={index} target='_blank' href={social[link as keyof typeof social]}>
                  {link}
                </S.SocialButton>
              ),
          )}
          {/* space-between을 위한 빈 div */}
          <div />
          <S.DropdownButton onMouseLeave={() => setIsDropdownOpened(false)}>
            {isDropdownOpened && (
              <S.Dropdown>
                {Object.keys(dropdown).map(
                  (link, index) =>
                    dropdown[link as keyof typeof dropdown] && (
                      <S.SocialButton key={index} target='_blank' href={dropdown[link as keyof typeof dropdown]}>
                        {link}
                      </S.SocialButton>
                    ),
                )}
              </S.Dropdown>
            )}
          </S.DropdownButton>
        </S.SocialWrapper>
      </S.IntroWrapper>
    </S.Wrapper>
  );
};

export default MainBanner;
